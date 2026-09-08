import { describe, expect, it } from "vitest";
import { formatWeekdayDate } from "./DateInput";

describe("formatWeekdayDate", () => {
  it("echoes a Vietnamese weekday + dd/MM/yyyy", () => {
    // 2026-09-08 is a Tuesday in Asia/Ho_Chi_Minh
    expect(formatWeekdayDate("2026-09-08")).toBe("Thứ Ba, 08/09/2026");
  });

  it("uses 'Chủ Nhật' for Sundays", () => {
    expect(formatWeekdayDate("2026-09-13")).toMatch(/^Chủ Nhật, 13\/09\/2026$/);
  });

  it("returns null for partial or invalid input", () => {
    expect(formatWeekdayDate("")).toBeNull();
    expect(formatWeekdayDate("2026-09")).toBeNull();
    expect(formatWeekdayDate("2026-13-40")).toBeNull();
    expect(formatWeekdayDate("08/09/2026")).toBeNull();
  });
});
