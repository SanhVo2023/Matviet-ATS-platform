import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * /api/agent/sweep — HiringAgent DO alarm target (ADR 0020).
 *
 * The per-job Durable Object fires its stale-check timers here (via the SELF
 * service binding). This route runs in the Next server context and owns ALL
 * business logic: it re-reads live D1 state, decides whether the candidate is
 * actually stale, and creates a `nudge_stale` proposal if so. A no-op
 * response is the normal case (the candidate moved on since the timer was
 * armed).
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (same scheme as the drains).
 */
export async function GET(req: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("Authorization") ?? "";
  if (!constantTimeEqual(auth, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const jobId = url.searchParams.get("job");
  const candidateId = url.searchParams.get("candidate");
  if (!jobId) {
    return NextResponse.json({ error: "job is required" }, { status: 400 });
  }

  // Phase 2 (ADR 0020) wires the nudge_stale generator here.
  const { sweepCandidate } = await import("@/server/agent-flows/sweep");
  const result = await sweepCandidate(jobId, candidateId);
  return NextResponse.json(result);
}

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
  return diff === 0;
}
