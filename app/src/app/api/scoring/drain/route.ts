/**
 * /api/scoring/drain — cron-protected queue drain.
 *
 * Schedule: every 5 min via Cloudflare Cron Trigger (custom-worker.ts calls
 * this route in-process). Processes up to MAX_BATCH due rows sequentially —
 * scoring runs in this Worker now (ADR 0009), so "drain" means "do the work",
 * not "dispatch to an edge function".
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`.
 */
import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { runScoringJob, type ScoringOutcome } from "@/server/scoring/worker";

export const dynamic = "force-dynamic";

const MAX_BATCH = 10;

export async function GET(req: Request): Promise<Response> {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  // ?limit=N caps the batch (each job ≈ 30s of AI wall-clock — small batches
  // keep manual drains inside client/proxy request timeouts).
  const limitParam = Number(new URL(req.url).searchParams.get("limit"));
  const batch =
    Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_BATCH) : MAX_BATCH;

  const outcomes: ScoringOutcome[] = [];
  for (let i = 0; i < batch; i++) {
    const outcome = await runScoringJob();
    if (outcome.status === "idle") break;
    outcomes.push(outcome);
  }

  if (outcomes.length === 0) {
    return NextResponse.json({ status: "idle", drained: 0 });
  }
  return NextResponse.json({
    status: "drained",
    drained: outcomes.length,
    succeeded: outcomes.filter((o) => o.status === "succeeded").length,
    failed: outcomes.filter((o) => o.status === "failed").length,
  });
}
