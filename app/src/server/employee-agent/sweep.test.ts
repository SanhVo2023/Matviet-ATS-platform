import { describe, it, expect } from "vitest";
import {
  classifyContractClock,
  daysUntil,
  PROBATION_WINDOW_DAYS,
  RENEWAL_WINDOW_DAYS,
} from "./sweep";

const TODAY = "2026-09-08";
const plus = (days: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

describe("daysUntil", () => {
  it("counts whole days between two dates", () => {
    expect(daysUntil(TODAY, TODAY)).toBe(0);
    expect(daysUntil(TODAY, plus(7))).toBe(7);
    expect(daysUntil(TODAY, plus(-3))).toBe(-3);
  });
});

describe("classifyContractClock", () => {
  it("probation: fires within the probation window, not before", () => {
    expect(classifyContractClock("thu_viec", plus(PROBATION_WINDOW_DAYS), TODAY)).toBe(
      "probation_review",
    );
    expect(classifyContractClock("thu_viec", plus(PROBATION_WINDOW_DAYS + 1), TODAY)).toBeNull();
  });

  it("probation: fires when already past due", () => {
    expect(classifyContractClock("thu_viec", plus(-2), TODAY)).toBe("probation_review");
  });

  it("fixed-term: fires within the renewal window, not before", () => {
    expect(classifyContractClock("xac_dinh_thoi_han", plus(RENEWAL_WINDOW_DAYS), TODAY)).toBe(
      "contract_renewal",
    );
    expect(
      classifyContractClock("xac_dinh_thoi_han", plus(RENEWAL_WINDOW_DAYS + 1), TODAY),
    ).toBeNull();
  });

  it("indefinite contracts never fire", () => {
    expect(classifyContractClock("khong_xac_dinh_thoi_han", plus(1), TODAY)).toBeNull();
    expect(classifyContractClock("khong_xac_dinh_thoi_han", null, TODAY)).toBeNull();
  });

  it("no end date → no clock", () => {
    expect(classifyContractClock("thu_viec", null, TODAY)).toBeNull();
    expect(classifyContractClock("xac_dinh_thoi_han", null, TODAY)).toBeNull();
  });
});
