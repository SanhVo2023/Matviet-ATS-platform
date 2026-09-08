import "server-only";
import { getSetting, setSetting, SETTING_KEYS } from "@/server/settings/repository";
import type { ReconcileResult } from "./reconcile";

const VN_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date in Vietnam as YYYY-MM-DD (en-CA formats ISO-like). */
export function vnDateString(d: Date = new Date()): string {
  return VN_DATE.format(d);
}

export interface DailyRunResult {
  skipped: boolean;
  date: string;
  employee?: { probation: number; renewal: number };
  hiring?: ReconcileResult;
  error?: string;
}

/**
 * The once-a-day agent pass (audit P1 "dedicated cron + catch-up marker").
 * The cron pokes this every minute after 01:00 UTC; the marker makes it run
 * at most once per VN day, and a run that throws clears the marker so the
 * next tick retries instead of losing the day.
 */
export async function runDailySweeps(opts: { force?: boolean } = {}): Promise<DailyRunResult> {
  const today = vnDateString();
  const last = await getSetting(SETTING_KEYS.agentLastDailySweep);
  if (!opts.force && last === today) return { skipped: true, date: today };

  await setSetting(SETTING_KEYS.agentLastDailySweep, today);
  try {
    const { sweepEmployeeCompliance } = await import("@/server/employee-agent/sweep");
    const { reconcileHiring } = await import("./reconcile");
    const employee = await sweepEmployeeCompliance();
    const hiring = await reconcileHiring();
    console.log(`[agent-flows] daily ${today}`, JSON.stringify({ employee, hiring }));
    return { skipped: false, date: today, employee, hiring };
  } catch (err) {
    // Give the next tick another go rather than silently losing the day.
    await setSetting(SETTING_KEYS.agentLastDailySweep, last ?? "").catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    console.error("[agent-flows] daily sweep failed:", err);
    return { skipped: false, date: today, error: message };
  }
}
