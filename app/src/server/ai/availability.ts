import "server-only";
import { getSetting, SETTING_KEYS } from "@/server/settings/repository";
import { isCircuitTripped } from "@/server/ai/cost-guard";

export type AiAvailability =
  | { ok: true }
  | { ok: false; reason: "disabled" | "cost_cap"; message: string };

/**
 * THE "may we call the model right now?" check (audit P1 — unified). Two
 * things can stop AI: the admin kill switch and the daily cost breaker. The
 * inference runtime always honoured both; the scoring claim-time guard only
 * looked at the switch, so a tripped breaker let rows get claimed and then
 * fail at inference. Every gate now asks this one function.
 */
export async function aiAvailability(): Promise<AiAvailability> {
  if ((await getSetting(SETTING_KEYS.aiEnabled)) === "false") {
    return {
      ok: false,
      reason: "disabled",
      message: "AI đang tắt (quản trị viên đã tắt trong Cài đặt → Hệ thống)",
    };
  }
  if (await isCircuitTripped()) {
    return {
      ok: false,
      reason: "cost_cap",
      message: "AI tạm dừng: đã chạm ngưỡng chi phí trong ngày — tự mở lại sau nửa đêm",
    };
  }
  return { ok: true };
}
