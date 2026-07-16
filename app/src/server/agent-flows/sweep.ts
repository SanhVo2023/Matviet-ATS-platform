import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, jobs, stage_history } from "@/db/schema";
import { proposeNudgeStale } from "./generators";
import { STALE_AFTER_DAYS } from "./events";

/**
 * Timer-driven evaluation (ADR 0020) — called by /api/agent/sweep when a
 * HiringAgent DO alarm fires. Re-reads live D1 state and decides whether the
 * candidate is actually stale; a no-op is the normal case (the candidate
 * moved on since the timer was armed — the DO's memory is just a hint,
 * D1 is the truth). Thresholds are shared with the timer arming (events.ts).
 */

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

  // interview_scheduled: anchored to the interview itself — stale means the
  // interview happened, the grace passed, and no evaluation was submitted.
  if (stage === "interview_scheduled") {
    const { latestInterviewTime, INTERVIEW_EVAL_GRACE_DAYS } = await import("./events");
    const anchor = await latestInterviewTime(candidateId);
    if (!anchor) return result;
    const overrideSec = Number(process.env.AGENT_STALE_OVERRIDE_SECONDS ?? "");
    const due =
      Number.isFinite(overrideSec) && overrideSec > 0
        ? anchor + overrideSec * 1000
        : anchor + INTERVIEW_EVAL_GRACE_DAYS * 86_400_000;
    if (Date.now() < due) return result;
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
      idleDays: Math.max(1, Math.floor((Date.now() - anchor) / 86_400_000)),
    });
    result.proposed = 1;
    console.log(`[agent-flows] sweep job=${jobId} candidate=${candidateId} -> nudge_stale (eval)`);
    return result;
  }

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
