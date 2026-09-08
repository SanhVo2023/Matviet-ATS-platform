import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/settings/repository", () => ({
  getSetting: vi.fn(),
  setSetting: vi.fn(),
  SETTING_KEYS: { agentLastDailySweep: "agent_last_daily_sweep" },
}));

import { vnDateString } from "./daily";

describe("vnDateString", () => {
  it("rolls the date at Vietnam midnight, not UTC midnight", () => {
    // 18:00Z on the 8th is 01:00 on the 9th in Asia/Ho_Chi_Minh (UTC+7)
    expect(vnDateString(new Date("2026-09-08T18:00:00Z"))).toBe("2026-09-09");
    expect(vnDateString(new Date("2026-09-08T16:59:59Z"))).toBe("2026-09-08");
  });

  it("formats as YYYY-MM-DD", () => {
    expect(vnDateString(new Date("2026-01-05T03:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
