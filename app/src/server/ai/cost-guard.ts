import "server-only";
import { and, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { ai_usage_log } from "@/db/schema";
import { getSetting, setSetting } from "@/server/settings/repository";
import { deliverMail } from "@/server/email/transport";

/**
 * AI cost guardrails (renovation R5) — the $5 soft alert / $25 hard circuit
 * breaker specified in CLAUDE.md but never built. Spend is summed from
 * ai_usage_log per Vietnam calendar day; the breaker auto-resets at VN
 * midnight (it's keyed by date). Independent of the admin kill switch.
 */
export const COST_SETTING_KEYS = {
  softUsd: "ai_cost_soft_usd",
  hardUsd: "ai_cost_hard_usd",
  alertSentDate: "ai_cost_alert_sent_date",
  trippedDate: "ai_cost_tripped_date",
  alertEmail: "ai_alert_email",
} as const;

const DEFAULT_SOFT = 5;
const DEFAULT_HARD = 25;

/** Start-of-today in Vietnam (UTC+7), as a UTC ISO string. */
function vnMidnightUtcIso(): string {
  const VN = 7 * 60 * 60 * 1000;
  const nowVn = new Date(Date.now() + VN);
  const startVn = Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate());
  return new Date(startVn - VN).toISOString();
}

/** Today's VN date key, e.g. "2026-09-07". */
function vnDateKey(): string {
  const nowVn = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return nowVn.toISOString().slice(0, 10);
}

export async function getTodaySpendUsd(): Promise<number> {
  const db = await getDb();
  const row = await db
    .select({ total: sql<number>`COALESCE(SUM(${ai_usage_log.cost_usd}), 0)` })
    .from(ai_usage_log)
    .where(and(gte(ai_usage_log.created_at, vnMidnightUtcIso())))
    .get();
  return Number(row?.total ?? 0);
}

async function num(key: string, fallback: number): Promise<number> {
  const v = await getSetting(key);
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** True when today's spend has tripped the hard cap (auto-resets at VN midnight). */
export async function isCircuitTripped(): Promise<boolean> {
  return (await getSetting(COST_SETTING_KEYS.trippedDate)) === vnDateKey();
}

/**
 * Called after each AI usage event (from runtime.usageSink). Sends the soft
 * alert once/day and trips the breaker at the hard cap. Best-effort; never
 * throws into the inference path.
 */
export async function checkAfterUsage(): Promise<void> {
  try {
    const [spend, soft, hard] = await Promise.all([
      getTodaySpendUsd(),
      num(COST_SETTING_KEYS.softUsd, DEFAULT_SOFT),
      num(COST_SETTING_KEYS.hardUsd, DEFAULT_HARD),
    ]);
    const today = vnDateKey();

    if (spend >= hard && (await getSetting(COST_SETTING_KEYS.trippedDate)) !== today) {
      await setSetting(COST_SETTING_KEYS.trippedDate, today);
      await notify(
        `⛔ AI đã đạt hạn mức ${hard} USD/ngày`,
        `Chi phí AI hôm nay đã đạt ${spend.toFixed(2)} USD, vượt hạn mức cứng ${hard} USD. Đã tạm ngắt AI cho tới nửa đêm (giờ VN). Có thể chỉnh hạn mức trong Cài đặt → Hệ thống.`,
      );
      return;
    }

    if (spend >= soft && (await getSetting(COST_SETTING_KEYS.alertSentDate)) !== today) {
      await setSetting(COST_SETTING_KEYS.alertSentDate, today);
      await notify(
        `⚠️ AI đã vượt ${soft} USD hôm nay`,
        `Chi phí AI hôm nay là ${spend.toFixed(2)} USD, đã vượt ngưỡng cảnh báo ${soft} USD (hạn mức cứng: ${hard} USD).`,
      );
    }
  } catch (err) {
    console.warn("[ai] cost-guard check failed:", err);
  }
}

async function notify(subject: string, body: string): Promise<void> {
  const to = await getSetting(COST_SETTING_KEYS.alertEmail);
  if (!to) return;
  await deliverMail({ to: [to], subject, bodyHtml: `<p>${body}</p>` }).catch((e) =>
    console.warn("[ai] cost alert email failed:", e),
  );
}
