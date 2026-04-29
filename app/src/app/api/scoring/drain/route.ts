/**
 * /api/scoring/drain — cron-protected queue drain.
 *
 * Schedule: every 5 min via Netlify Cron (see netlify.toml). Selects up to
 * 10 queued + retry-due rows and dispatches them to the score-candidate
 * Edge Function. Backstop in case the upload-time fire-and-forget gets dropped.
 *
 * Auth: requires header `Authorization: Bearer ${CRON_SECRET}`. The secret
 * is set on Netlify; the Server Action path uses SCORING_INTERNAL_SECRET.
 * Two distinct secrets so a leaked CRON_SECRET can't directly invoke the
 * Edge Function (still has to go through the drain route).
 */
import { NextResponse } from "next/server";
import { listDrainableQueueRows } from "@/server/scoring/repository";
import { triggerEdgeFunction } from "@/server/scoring/orchestration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  const rows = await listDrainableQueueRows(MAX_BATCH);
  if (rows.length === 0) {
    return NextResponse.json({ status: "idle", drained: 0 });
  }
  for (const r of rows) {
    triggerEdgeFunction(r.candidate_id);
  }
  return NextResponse.json({ status: "dispatched", drained: rows.length });
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
