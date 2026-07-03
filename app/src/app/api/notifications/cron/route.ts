import { NextResponse } from "next/server";
import { runNotificationSweep } from "@/server/notifications/service";

export const dynamic = "force-dynamic";

/**
 * /api/notifications/cron — interview reminders + retention prune.
 * Invoked in-process by custom-worker.ts every minute alongside the drains.
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
  const result = await runNotificationSweep();
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
