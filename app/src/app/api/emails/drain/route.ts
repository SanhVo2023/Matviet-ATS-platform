/**
 * /api/emails/drain — cron-protected outbound email queue drain.
 *
 * Schedule: every minute via Cloudflare Cron Trigger (custom-worker.ts). Selects up to
 * MAX_BATCH queued + retry-due rows and sends them through MS Graph.
 *
 * Auth: requires header `Authorization: Bearer ${CRON_SECRET}`. Same secret
 * shared with the scoring drain — both cron jobs are HR-internal infrastructure.
 */
import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { drainQueue } from "@/server/email/sender";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BATCH = 10;

export async function GET(req: Request): Promise<Response> {
  const denied = requireCronAuth(req);
  if (denied) return denied;
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
