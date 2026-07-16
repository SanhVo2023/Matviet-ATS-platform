import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, interviews, jobs, type ProposalKind } from "@/db/schema";
import { SCORE_BAND_MEDIUM_MIN } from "@/lib/stage-visuals";
import { pingHiringAgent } from "./agent-link";
import { listOpenProposalsForCandidate, supersedeProposals } from "./repository";
import { proposeInterviewInvite, proposeStartApproval, proposeComposeOffer } from "./generators";

/**
 * Pipeline-event intake (ADR 0020) — the ONE function emitters call. Fire it
 * inside `waitUntil` (or awaited best-effort); it never throws.
 *
 * Responsibilities per event:
 *  1. supersede open proposals the event just invalidated
 *  2. generate the next proposal the situation calls for
 *  3. (re)arm the job agent's stale timer for this candidate
 *
 * ALL stage semantics live in this file (+ sweep.ts): which stages get
 * watched, for how long, which proposal kinds fit which stages. The DO and
 * the repository stay semantics-free.
 */

export type AgentEvent =
  | { type: "scoring_succeeded"; candidateId: string }
  | { type: "evaluation_submitted"; candidateId: string }
  | { type: "approval_finalized"; candidateId: string; approved: boolean }
  | { type: "offer_responded"; candidateId: string; accepted: boolean }
  | { type: "stage_changed"; candidateId: string; toStage: string }
  | { type: "candidate_archived"; candidateId: string };

/** Idle DAYS before a stale nudge, per stage (sweep.ts shares this). */
export const STALE_AFTER_DAYS: Record<string, number> = {
  screened: 3,
  interviewed: 2,
  test_sent: 3,
  test_done: 2,
  offer_sent: 3,
};

/**
 * interview_scheduled is watched RELATIVE TO THE INTERVIEW, not the stage
 * change: check 1 day after the (latest) interview should have happened —
 * "phỏng vấn xong mà chưa có đánh giá" was a fully silent gap (audit #2).
 */
export const INTERVIEW_EVAL_GRACE_DAYS = 1;

function envOverrideSeconds(): number | null {
  const override = Number(process.env.AGENT_STALE_OVERRIDE_SECONDS ?? "");
  return Number.isFinite(override) && override > 0 ? override : null;
}

/** Test hook: override every stale delay (seconds) via env. */
async function staleDelayFor(candidateId: string, stage: string): Promise<number | null> {
  const override = envOverrideSeconds();
  if (stage === "interview_scheduled") {
    const anchor = await latestInterviewTime(candidateId);
    if (!anchor) return null;
    if (override) return override;
    const dueMs = anchor + INTERVIEW_EVAL_GRACE_DAYS * 86_400_000 - Date.now();
    return Math.max(3600, Math.ceil(dueMs / 1000));
  }
  const days = STALE_AFTER_DAYS[stage];
  if (days == null) return null;
  return override ?? days * 86_400;
}

/** Epoch ms of the candidate's most recent scheduled interview END, or null. */
export async function latestInterviewTime(candidateId: string): Promise<number | null> {
  const db = await getDb();
  const row = await db
    .select({ scheduled_at: interviews.scheduled_at, duration_min: interviews.duration_min })
    .from(interviews)
    .where(and(eq(interviews.candidate_id, candidateId), ne(interviews.status, "cancelled")))
    .orderBy(desc(interviews.scheduled_at))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!row) return null;
  return Date.parse(row.scheduled_at) + (row.duration_min ?? 60) * 60_000;
}

/**
 * Candidate stages an OPEN proposal of each kind is still valid at — any
 * move elsewhere supersedes the card. nudge_stale is stage-specific by
 * construction (dedupe key carries the stage), so any movement voids it.
 */
const VALID_STAGES_BY_KIND: Record<ProposalKind, string[] | "any-movement-voids"> = {
  interview_invite: ["screened", "new", "screening"],
  start_approval: ["interviewed", "test_sent", "test_done"],
  compose_offer: ["offer_sent"],
  nudge_stale: "any-movement-voids",
  job_from_intent: [], // job-level; never candidate-bound (unreachable here)
};

async function reconcileOpenProposals(candidateId: string, currentStage: string): Promise<void> {
  const open = await listOpenProposalsForCandidate(candidateId);
  const stale = open.filter((p) => {
    const valid = VALID_STAGES_BY_KIND[p.kind];
    if (valid === "any-movement-voids") return true;
    return !valid.includes(currentStage);
  });
  await supersedeProposals(stale.map((s) => s.id));
}

export async function emitAgentEvent(evt: AgentEvent): Promise<void> {
  try {
    const db = await getDb();
    const row = await db
      .select({
        id: candidates.id,
        job_id: candidates.job_id,
        full_name: candidates.full_name,
        current_stage: candidates.current_stage,
        ai_score: candidates.ai_score,
        is_archived: candidates.is_archived,
        job_title: jobs.title,
        job_flow_type: jobs.flow_type,
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.job_id, jobs.id))
      .where(eq(candidates.id, evt.candidateId))
      .limit(1)
      .then((r) => r[0] ?? null);
    if (!row) return;
    if (row.is_archived || evt.type === "candidate_archived") {
      // Archive = full cleanup: every open card leaves the feed, the DO
      // stops watching. (Cards for archived candidates were previously
      // orphaned + still approvable — audit gap #1.)
      const open = await listOpenProposalsForCandidate(row.id);
      await supersedeProposals(open.map((p) => p.id));
      await pingHiringAgent({
        jobId: row.job_id,
        candidateId: row.id,
        stage: String(row.current_stage),
        checkAfterSeconds: null,
      });
      return;
    }
    const cand = row;
    const job = { id: row.job_id, title: row.job_title, flow_type: row.job_flow_type };

    const stage = String(cand.current_stage);
    await reconcileOpenProposals(cand.id, stage);

    // One guard for both entry paths (auto-advance after scoring AND manual
    // move): a well-scored candidate sitting at `screened` gets an invite
    // proposal.
    const inviteWorthy =
      (evt.type === "scoring_succeeded" ||
        (evt.type === "stage_changed" && evt.toStage === "screened")) &&
      stage === "screened" &&
      typeof cand.ai_score === "number" &&
      cand.ai_score >= SCORE_BAND_MEDIUM_MIN;
    if (inviteWorthy) await proposeInterviewInvite({ candidate: cand, job });

    if (
      (evt.type === "approval_finalized" && evt.approved) ||
      (evt.type === "stage_changed" && evt.toStage === "offer_sent")
    ) {
      await proposeComposeOffer({ candidate: cand, job });
    }

    // Evaluation in — OR a test graded (test-only roles never get an
    // evaluation; grading is their "kết quả đã có" moment — audit gap #3).
    if (
      evt.type === "evaluation_submitted" ||
      (evt.type === "stage_changed" && evt.toStage === "test_done")
    ) {
      await proposeStartApproval({ candidate: cand, job });
    }

    await pingHiringAgent({
      jobId: cand.job_id,
      candidateId: cand.id,
      stage,
      checkAfterSeconds: await staleDelayFor(cand.id, stage),
    });
  } catch (err) {
    console.error("[agent-flows] emitAgentEvent failed:", err);
  }
}

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
