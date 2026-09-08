import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { agent_proposals, approvals, candidates, jobs, scoring_queue } from "@/db/schema";
import { STALE_AFTER_DAYS } from "./events";
import { proposeConfirmHire, proposeOrphanApproval, proposeRetryScoring } from "./generators";
import { supersedeProposals } from "./repository";
import { sweepCandidate } from "./sweep";

export interface ReconcileResult {
  candidates: number;
  confirm_hire: number;
  retry_scoring: number;
  orphan_approval: number;
  stale_checked: number;
  stale_proposed: number;
  archived_superseded: number;
}

/**
 * Nightly hiring reconcile (agentic audit P1). The event path + DO timers
 * are the fast lane; this is the truth-based backstop that re-reads D1 and
 * proposes whatever the fast lane missed — a lost alarm, an event emitted
 * before a deploy, a row edited by hand. Everything goes through the same
 * dedupe keys, so a healthy day proposes nothing.
 *
 *  - offer_accepted with no hire         → confirm_hire
 *  - scoring failed (intake)             → retry_scoring (manual after 3 tries)
 *  - pending approvals off `approving`   → orphan_approval
 *  - watched stages                      → sweepCandidate (nudge_stale backstop)
 *  - open cards on archived candidates   → superseded
 */
export async function reconcileHiring(
  opts: { maxStaleChecks?: number } = {},
): Promise<ReconcileResult> {
  const db = await getDb();
  const result: ReconcileResult = {
    candidates: 0,
    confirm_hire: 0,
    retry_scoring: 0,
    orphan_approval: 0,
    stale_checked: 0,
    stale_proposed: 0,
    archived_superseded: 0,
  };

  const rows = await db
    .select({
      id: candidates.id,
      job_id: candidates.job_id,
      full_name: candidates.full_name,
      current_stage: candidates.current_stage,
      ai_score: candidates.ai_score,
      ai_screening_status: candidates.ai_screening_status,
      ai_screening_error: candidates.ai_screening_error,
      email: candidates.email,
      created_at: candidates.created_at,
      job_title: jobs.title,
      job_flow_type: jobs.flow_type,
    })
    .from(candidates)
    .innerJoin(jobs, eq(candidates.job_id, jobs.id))
    .where(eq(candidates.is_archived, false));
  result.candidates = rows.length;

  for (const c of rows) {
    const stage = String(c.current_stage);
    const candidate = {
      id: c.id,
      job_id: c.job_id,
      full_name: c.full_name,
      ai_score: c.ai_score,
      current_stage: stage,
    };
    const job = { id: c.job_id, title: c.job_title, flow_type: c.job_flow_type };

    if (stage === "offer_accepted") {
      if (await proposeConfirmHire({ candidate, job })) result.confirm_hire++;
    }

    if (stage === "intake" && c.ai_screening_status === "failed") {
      const q = await db
        .select({ attempts: scoring_queue.attempts, last_error: scoring_queue.last_error })
        .from(scoring_queue)
        .where(eq(scoring_queue.candidate_id, c.id))
        .orderBy(desc(scoring_queue.enqueued_at))
        .limit(1)
        .then((r) => r[0] ?? null);
      const created = await proposeRetryScoring({
        candidate,
        job,
        attempts: q?.attempts ?? 0,
        error: q?.last_error ?? c.ai_screening_error ?? null,
      });
      if (created) result.retry_scoring++;
    }
  }

  // Pending approval steps whose candidate is no longer being approved (or is
  // archived) — ghost work in the approvers' queue. transitionStage cancels on
  // the normal path; this catches everything else.
  const pending = await db
    .select({
      candidate_id: approvals.candidate_id,
      full_name: candidates.full_name,
      current_stage: candidates.current_stage,
      is_archived: candidates.is_archived,
      ai_score: candidates.ai_score,
      job_id: candidates.job_id,
      job_title: jobs.title,
      job_flow_type: jobs.flow_type,
    })
    .from(approvals)
    .innerJoin(candidates, eq(approvals.candidate_id, candidates.id))
    .innerJoin(jobs, eq(candidates.job_id, jobs.id))
    .where(eq(approvals.status, "pending"));
  const orphanByCandidate = new Map<string, (typeof pending)[number] & { steps: number }>();
  for (const p of pending) {
    if (String(p.current_stage) === "approving" && !p.is_archived) continue;
    const hit = orphanByCandidate.get(p.candidate_id);
    if (hit) hit.steps++;
    else orphanByCandidate.set(p.candidate_id, { ...p, steps: 1 });
  }
  for (const o of orphanByCandidate.values()) {
    const created = await proposeOrphanApproval({
      candidate: {
        id: o.candidate_id,
        job_id: o.job_id,
        full_name: o.full_name,
        ai_score: o.ai_score,
        current_stage: String(o.current_stage),
        is_archived: !!o.is_archived,
      },
      job: { id: o.job_id, title: o.job_title, flow_type: o.job_flow_type },
      pendingSteps: o.steps,
    });
    if (created) result.orphan_approval++;
  }

  // Stale backstop: the DO alarm is a hint that can be lost; the sweep itself
  // is idempotent (dedupe `ns:<id>:<stage>`), so re-running it is free.
  const watched = rows
    .filter((c) => STALE_AFTER_DAYS[String(c.current_stage)] != null)
    .slice(0, opts.maxStaleChecks ?? 300);
  for (const c of watched) {
    const r = await sweepCandidate(c.job_id, c.id);
    result.stale_checked++;
    result.stale_proposed += r.proposed;
  }

  // Open cards on archived candidates — should have been superseded on the
  // archive event; make sure.
  const orphanCards = await db
    .select({ id: agent_proposals.id })
    .from(agent_proposals)
    .innerJoin(candidates, eq(agent_proposals.candidate_id, candidates.id))
    .where(and(eq(agent_proposals.status, "proposed"), eq(candidates.is_archived, true)));
  if (orphanCards.length > 0) await supersedeProposals(orphanCards.map((o) => o.id));
  result.archived_superseded = orphanCards.length;

  return result;
}
