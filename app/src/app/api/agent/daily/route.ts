import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * /api/agent/daily — the once-per-day agent pass (HRM compliance clock +
 * hiring reconcile). Cron-driven every minute after 01:00 UTC; the settings
 * marker inside runDailySweeps makes it idempotent per VN day. `?force=1`
 * re-runs today (manual/ops use — still CRON_SECRET-gated).
 */
export async function GET(req: Request): Promise<Response> {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const force = new URL(req.url).searchParams.get("force") === "1";
  const { runDailySweeps } = await import("@/server/agent-flows/daily");
  const result = await runDailySweeps({ force });
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}
