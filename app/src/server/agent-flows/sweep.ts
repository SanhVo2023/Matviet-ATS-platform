import "server-only";

/**
 * Timer-driven evaluation (ADR 0020) — called by /api/agent/sweep when a
 * HiringAgent DO alarm fires. Re-reads live D1 state and decides whether the
 * candidate is actually stale; a no-op is the normal case.
 *
 * Phase 1: skeleton (roundtrip verification). Phase 2 adds the nudge_stale
 * generator.
 */
export async function sweepCandidate(
  jobId: string,
  candidateId: string | null,
): Promise<{ job: string; candidate: string | null; proposed: number }> {
  console.log(`[agent-flows] sweep job=${jobId} candidate=${candidateId ?? "-"}`);
  return { job: jobId, candidate: candidateId, proposed: 0 };
}
