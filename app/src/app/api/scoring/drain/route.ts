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
import { runScoringJob, type ScoringOutcome } from "@/server/scoring/worker";

export const dynamic = "force-dynamic";

const MAX_BATCH = 10;

export async function GET(req: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("Authorization") ?? "";
  if (!constantTimeEqual(auth, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const outcomes: ScoringOutcome[] = [];
  for (let i = 0; i < MAX_BATCH; i++) {
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

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let mismatch = 0;
  for (let i = 0; i < aBytes.length; i++) mismatch |= aBytes[i]! ^ bBytes[i]!;
  return mismatch === 0;
}
