import { describe, expect, it } from "vitest";
import { defaultReportFilter, parseReportFilter } from "./filter";

describe("defaultReportFilter", () => {
  it("returns last 30 days, no other filters", () => {
    const f = defaultReportFilter();
    expect(f.job_id).toBeNull();
    expect(f.role_family).toBeNull();
    expect(f.source).toBeNull();
    const span = new Date(f.to).getTime() - new Date(f.from).getTime();
    const days = span / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29.5);
    expect(days).toBeLessThan(30.5);
  });
});

describe("parseReportFilter", () => {
  it("falls back to defaults for empty params", () => {
    const f = parseReportFilter({});
    expect(f.job_id).toBeNull();
    expect(f.role_family).toBeNull();
    expect(f.source).toBeNull();
  });

  it("parses valid params", () => {
    const f = parseReportFilter({
      from: "2026-01-01",
      to: "2026-04-29",
      job: "11111111-1111-1111-1111-111111111111",
      role: "sales",
      source: "csv_import",
    });
    expect(f.job_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(f.role_family).toBe("sales");
    expect(f.source).toBe("csv_import");
    expect(f.from).toContain("2026-01-01");
    expect(f.to).toContain("2026-04-29");
  });

  it("drops invalid UUIDs and enums silently", () => {
    const f = parseReportFilter({
      job: "not-a-uuid",
      role: "made_up_family",
      source: "made_up_source",
    });
    expect(f.job_id).toBeNull();
    expect(f.role_family).toBeNull();
    expect(f.source).toBeNull();
  });

  it("works with URLSearchParams instance", () => {
    const usp = new URLSearchParams();
    usp.set("role", "manager");
    usp.set("source", "topcv_api");
    const f = parseReportFilter(usp);
    expect(f.role_family).toBe("manager");
    expect(f.source).toBe("topcv_api");
  });
});
