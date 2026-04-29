import { describe, expect, it } from "vitest";
import { ALL_STAGES, ORDERED_STAGE_PAIRS, STAGE_TO_SUPER } from "./stage-groups";

describe("STAGE_TO_SUPER", () => {
  it("covers every pipeline stage", () => {
    for (const stage of ALL_STAGES) {
      expect(STAGE_TO_SUPER[stage]).toBeDefined();
    }
  });

  it("maps the funnel correctly", () => {
    expect(STAGE_TO_SUPER.new).toBe("applied");
    expect(STAGE_TO_SUPER.screened).toBe("screening");
    expect(STAGE_TO_SUPER.interviewed).toBe("interview");
    expect(STAGE_TO_SUPER.salary_deal).toBe("approval");
    expect(STAGE_TO_SUPER.offer_sent).toBe("offer");
    expect(STAGE_TO_SUPER.hired).toBe("hired");
    expect(STAGE_TO_SUPER.rejected).toBe("rejected");
    expect(STAGE_TO_SUPER.withdrew).toBe("rejected");
  });
});

describe("ORDERED_STAGE_PAIRS", () => {
  it("13 adjacent pairs from new to hired", () => {
    expect(ORDERED_STAGE_PAIRS.length).toBe(13);
    expect(ORDERED_STAGE_PAIRS[0]).toEqual(["new", "screening"]);
    expect(ORDERED_STAGE_PAIRS[ORDERED_STAGE_PAIRS.length - 1]).toEqual([
      "offer_accepted",
      "hired",
    ]);
  });

  it("forms a continuous chain (each pair's `to` matches next pair's `from`)", () => {
    for (let i = 1; i < ORDERED_STAGE_PAIRS.length; i++) {
      const prevTo = ORDERED_STAGE_PAIRS[i - 1]![1];
      const currentFrom = ORDERED_STAGE_PAIRS[i]![0];
      expect(currentFrom).toBe(prevTo);
    }
  });
});
