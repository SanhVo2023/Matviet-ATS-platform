import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { runNotificationSweep } from "@/server/notifications/service";

export const dynamic = "force-dynamic";

/**
 * /api/notifications/cron — interview reminders + retention prune.
 * Invoked in-process by custom-worker.ts every minute alongside the drains.
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (same scheme as the drains).
 */
export async function GET(req: Request): Promise<Response> {
  const denied = requireCronAuth(req);
  if (denied) return denied;
  const result = await runNotificationSweep();
  return NextResponse.json(result);
}
