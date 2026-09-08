import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * /api/employee/sweep — nightly HRM compliance-clock sweep (H1).
 *
 * Cron-driven (custom-worker CRON_ROUTES). Scans active dated contracts and
 * emits propose-first cards: probation review (thử việc ending soon) and
 * contract renewal (fixed-term ending within 30 days). Dedupe keeps it from
 * re-proposing an open/handled card. A zero-count result is the normal case.
 */
export async function GET(req: Request): Promise<Response> {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const { sweepEmployeeCompliance } = await import("@/server/employee-agent/sweep");
  const result = await sweepEmployeeCompliance();
  return NextResponse.json(result);
}
