import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { pingHiringAgent } from "@/server/agent-flows/agent-link";

export const dynamic = "force-dynamic";

/**
 * /api/agent/ping — ops/debug hook (ADR 0020): manually arm a HiringAgent
 * timer, e.g. to verify the DO → alarm → SELF → sweep roundtrip, or to
 * re-arm agents after an incident. CRON_SECRET-gated; not linked from any UI.
 *
 * POST { jobId, candidateId, stage, checkAfterSeconds }
 */
export async function POST(req: Request): Promise<Response> {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const body = (await req.json()) as {
    jobId?: string;
    candidateId?: string;
    stage?: string;
    checkAfterSeconds?: number | null;
  };
  if (!body.jobId || !body.candidateId) {
    return NextResponse.json({ error: "jobId and candidateId are required" }, { status: 400 });
  }
  await pingHiringAgent({
    jobId: body.jobId,
    candidateId: body.candidateId,
    stage: body.stage ?? "unknown",
    checkAfterSeconds: body.checkAfterSeconds ?? null,
  });
  return NextResponse.json({ ok: true });
}

/** GET /api/agent/ping?job=<id> — read the agent's watch state + timers. */
export async function GET(req: Request): Promise<Response> {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const jobId = new URL(req.url).searchParams.get("job");
  if (!jobId) return NextResponse.json({ error: "job is required" }, { status: 400 });

  const { snapshotHiringAgent } = await import("@/server/agent-flows/agent-link");
  const snap = await snapshotHiringAgent(jobId);
  return NextResponse.json(snap ?? { error: "agent unreachable" }, { status: snap ? 200 : 502 });
}
