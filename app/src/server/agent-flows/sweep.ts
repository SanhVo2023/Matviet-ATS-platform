import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, jobs, stage_history } from "@/db/schema";
import { proposeNudgeStale } from "./generators";

/**
 * Timer-driven evaluation (ADR 0020) — called by /api/agent/sweep when a
 * HiringAgent DO alarm fires. Re-reads live D1 state and decides whether the
 * candidate is actually stale; a no-op is the normal case (the candidate
 * moved on since the timer was armed — the DO's memory is just a hint,
 * D1 is the truth).
 */

/** Same thresholds the DO timers are armed with (events.ts). */
const STALE_AFTER_DAYS: Record<string, number> = {
  screened: 3,
  interviewed: 2,
  test_sent: 3,
  test_done: 2,
  offer_sent: 3,
};

export async function sweepCandidate(
  jobId: string,
  candidateId: string | null,
): Promise<{ job: string; candidate: string | null; proposed: number }> {
  const result = { job: jobId, candidate: candidateId, proposed: 0 };
  if (!candidateId) return result;

  const db = await getDb();
  const cand = await db
    .select({
      id: candidates.id,
      job_id: candidates.job_id,
      full_name: candidates.full_name,
      current_stage: candidates.current_stage,
      email: candidates.email,
      created_at: candidates.created_at,
      is_archived: candidates.is_archived,
    })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!cand || cand.is_archived || cand.job_id !== jobId) return result;

  const stage = String(cand.current_stage);
  const thresholdDays = STALE_AFTER_DAYS[stage];
  if (thresholdDays == null) return result; // stage isn't watched

  // Idle time = since the last stage transition (fallback: candidate created).
  const lastMove = await db
    .select({ at: stage_history.at })
    .from(stage_history)
    .where(eq(stage_history.candidate_id, candidateId))
    .orderBy(desc(stage_history.at))
    .limit(1)
    .then((r) => r[0] ?? null);
  const lastActivity = Date.parse(lastMove?.at ?? cand.created_at);
  const idleDays = Math.floor((Date.now() - lastActivity) / 86_400_000);

  // Test override so the roundtrip is verifiable without waiting days.
  const overrideSeconds = Number(process.env.AGENT_STALE_OVERRIDE_SECONDS ?? "");
  const isStale =
    Number.isFinite(overrideSeconds) && overrideSeconds > 0
      ? Date.now() - lastActivity >= overrideSeconds * 1000
      : idleDays >= thresholdDays;
  if (!isStale) return result;

  const job = await db
    .select({ id: jobs.id, title: jobs.title, flow_type: jobs.flow_type })
    .from(jobs)
    .where(eq(jobs.id, cand.job_id))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!job) return result;

  await proposeNudgeStale({
    candidate: { ...cand, current_stage: stage },
    job,
    idleDays: Math.max(idleDays, 1),
  });
  result.proposed = 1;
  console.log(`[agent-flows] sweep job=${jobId} candidate=${candidateId} -> nudge_stale`);
  return result;
}
