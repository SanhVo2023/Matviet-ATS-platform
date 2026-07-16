import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";

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
 */
export async function GET(req: Request): Promise<Response> {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const jobId = url.searchParams.get("job");
  const candidateId = url.searchParams.get("candidate");
  if (!jobId) {
    return NextResponse.json({ error: "job is required" }, { status: 400 });
  }

  const { sweepCandidate } = await import("@/server/agent-flows/sweep");
  const result = await sweepCandidate(jobId, candidateId);
  return NextResponse.json(result);
}
