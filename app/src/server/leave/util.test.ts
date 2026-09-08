import { describe, it, expect } from "vitest";
import { inclusiveDays, yearsOfService, annualLeaveEntitlement, rangesOverlap } from "./util";

describe("inclusiveDays", () => {
  it("counts both endpoints", () => {
    expect(inclusiveDays("2026-09-08", "2026-09-08")).toBe(1);
    expect(inclusiveDays("2026-09-08", "2026-09-10")).toBe(3);
  });
  it("returns 0 for invalid / reversed ranges", () => {
    expect(inclusiveDays("2026-09-10", "2026-09-08")).toBe(0);
    expect(inclusiveDays("", "2026-09-08")).toBe(0);
  });
});

describe("yearsOfService", () => {
  it("floors to completed years", () => {
    expect(yearsOfService("2020-09-08", "2026-09-08")).toBe(6);
    expect(yearsOfService("2020-09-09", "2026-09-08")).toBe(5); // anniversary not yet reached
    expect(yearsOfService(null, "2026-09-08")).toBe(0);
  });
});

describe("annualLeaveEntitlement", () => {
  it("is 12 for under 5 years", () => {
    expect(annualLeaveEntitlement("2024-01-01", "2026-09-08")).toBe(12);
    expect(annualLeaveEntitlement(null, "2026-09-08")).toBe(12);
  });
  it("adds 1 day per completed 5 years", () => {
    expect(annualLeaveEntitlement("2021-01-01", "2026-09-08")).toBe(13); // 5 yrs
    expect(annualLeaveEntitlement("2016-01-01", "2026-09-08")).toBe(14); // 10 yrs
  });
});

describe("rangesOverlap", () => {
  it("detects overlap inclusively", () => {
    expect(rangesOverlap("2026-09-01", "2026-09-10", "2026-09-10", "2026-09-12")).toBe(true);
    expect(rangesOverlap("2026-09-01", "2026-09-05", "2026-09-06", "2026-09-09")).toBe(false);
  });
});
