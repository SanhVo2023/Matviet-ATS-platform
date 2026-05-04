/**
 * /api/emails/drain — cron-protected outbound email queue drain.
 *
 * Schedule: every 5 min via Netlify Cron (see netlify.toml). Selects up to
 * MAX_BATCH queued + retry-due rows and sends them through MS Graph.
 *
 * Auth: requires header `Authorization: Bearer ${CRON_SECRET}`. Same secret
 * shared with the scoring drain — both cron jobs are HR-internal infrastructure.
 */
import { NextResponse } from "next/server";
import { drainQueue } from "@/server/email/sender";

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
  try {
    const summary = await drainQueue(MAX_BATCH);
    if (summary.drained === 0) {
      return NextResponse.json({ status: "idle", drained: 0 });
    }
    return NextResponse.json({ status: "drained", ...summary });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
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
