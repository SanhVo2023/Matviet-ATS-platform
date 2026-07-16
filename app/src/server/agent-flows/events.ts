import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, jobs } from "@/db/schema";
import { pingHiringAgent } from "./agent-link";
import { reconcileOpenProposals } from "./repository";
import { proposeInterviewInvite, proposeStartApproval, proposeComposeOffer } from "./generators";

/**
 * Pipeline-event intake (ADR 0020) — the ONE function emitters call. Fire it
 * inside `waitUntil` (or awaited best-effort); it never throws.
 *
 * Responsibilities per event:
 *  1. supersede open proposals the event just invalidated
 *  2. generate the next proposal the situation calls for
 *  3. (re)arm the job agent's stale timer for this candidate
 */

export type AgentEvent =
  | { type: "scoring_succeeded"; candidateId: string }
  | { type: "evaluation_submitted"; candidateId: string }
  | { type: "approval_finalized"; candidateId: string; approved: boolean }
  | { type: "offer_responded"; candidateId: string; accepted: boolean }
  | { type: "stage_changed"; candidateId: string; toStage: string }
  | { type: "candidate_created"; candidateId: string };

/** Idle time before a stale nudge, per stage. null = the agent doesn't watch. */
const STALE_AFTER_SECONDS: Record<string, number> = {
  screened: 3 * 86_400,
  interviewed: 2 * 86_400,
  test_sent: 3 * 86_400,
  test_done: 2 * 86_400,
  offer_sent: 3 * 86_400,
};

/** Test hook: override every stale delay (seconds) via env. */
function staleDelayFor(stage: string): number | null {
  const base = STALE_AFTER_SECONDS[stage];
  if (base == null) return null;
  const override = Number(process.env.AGENT_STALE_OVERRIDE_SECONDS ?? "");
  return Number.isFinite(override) && override > 0 ? override : base;
}

/** AI-score floor for auto-proposing an interview (matches verdict band ≥ TB). */
const INVITE_SCORE_FLOOR = 55;

/**
 * Fire-and-forget wrapper for request-path emitters (server actions, public
 * routes): rides `ctx.waitUntil` so the user's response never waits on
 * proposal generation (the interview generator can hit Graph). Background
 * contexts (scoring worker) await emitAgentEvent directly instead.
 */
export function emitAgentEventInBackground(evt: AgentEvent): void {
  void (async () => {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const { ctx } = await getCloudflareContext({ async: true });
      ctx.waitUntil(emitAgentEvent(evt));
    } catch {
      await emitAgentEvent(evt); // no ctx (tests, node) — still best-effort
    }
  })();
}

export async function emitAgentEvent(evt: AgentEvent): Promise<void> {
  try {
    const db = await getDb();
    const cand = await db
      .select({
        id: candidates.id,
        job_id: candidates.job_id,
        full_name: candidates.full_name,
        current_stage: candidates.current_stage,
        ai_score: candidates.ai_score,
        is_archived: candidates.is_archived,
      })
      .from(candidates)
      .where(eq(candidates.id, evt.candidateId))
      .limit(1)
      .then((r) => r[0] ?? null);
    if (!cand || cand.is_archived) return;
    const job = await db
      .select({ id: jobs.id, title: jobs.title, status: jobs.status, flow_type: jobs.flow_type })
      .from(jobs)
      .where(eq(jobs.id, cand.job_id))
      .limit(1)
      .then((r) => r[0] ?? null);
    if (!job) return;

    const stage = String(cand.current_stage);
    await reconcileOpenProposals(cand.id, stage);

    switch (evt.type) {
      case "scoring_succeeded": {
        if (
          stage === "screened" &&
          typeof cand.ai_score === "number" &&
          cand.ai_score >= INVITE_SCORE_FLOOR
        ) {
          await proposeInterviewInvite({ candidate: cand, job });
        }
        break;
      }
      case "stage_changed": {
        // Manual moves get the same help automatic ones do.
        if (
          evt.toStage === "screened" &&
          typeof cand.ai_score === "number" &&
          cand.ai_score >= INVITE_SCORE_FLOOR
        ) {
          await proposeInterviewInvite({ candidate: cand, job });
        }
        if (evt.toStage === "offer_sent") {
          await proposeComposeOffer({ candidate: cand, job });
        }
        break;
      }
      case "evaluation_submitted": {
        await proposeStartApproval({ candidate: cand, job });
        break;
      }
      case "approval_finalized": {
        if (evt.approved) await proposeComposeOffer({ candidate: cand, job });
        break;
      }
      case "offer_responded":
      case "candidate_created":
        break; // reconcile + re-arm below is all these need
    }

    await pingHiringAgent({
      jobId: cand.job_id,
      candidateId: cand.id,
      stage,
      checkAfterSeconds: staleDelayFor(stage),
    });
  } catch (err) {
    console.error("[agent-flows] emitAgentEvent failed:", err);
  }
}
