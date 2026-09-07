import { describe, expect, it } from "vitest";
import { tallyEvaluations } from "./repository";

describe("tallyEvaluations", () => {
  it("counts each recommendation bucket", () => {
    const t = tallyEvaluations([
      { recommendation: "strong_yes", proposed_salary: null },
      { recommendation: "yes", proposed_salary: null },
      { recommendation: "yes", proposed_salary: null },
      { recommendation: "maybe", proposed_salary: null },
      { recommendation: "no", proposed_salary: null },
    ]);
    expect(t).toMatchObject({ count: 5, strong_yes: 1, yes: 2, maybe: 1, no: 1 });
  });

  it("takes the highest proposed salary", () => {
    const t = tallyEvaluations([
      { recommendation: "yes", proposed_salary: 10_000_000 },
      { recommendation: "yes", proposed_salary: 12_500_000 },
      { recommendation: "maybe", proposed_salary: null },
    ]);
    expect(t.proposed_salary).toBe(12_500_000);
  });

  it("is empty-safe", () => {
    const t = tallyEvaluations([]);
    expect(t).toEqual({
      count: 0,
      strong_yes: 0,
      yes: 0,
      maybe: 0,
      no: 0,
      proposed_salary: null,
    });
  });

  it("ignores unknown recommendation values", () => {
    const t = tallyEvaluations([{ recommendation: "weird", proposed_salary: null }]);
    expect(t).toMatchObject({ count: 1, strong_yes: 0, yes: 0, maybe: 0, no: 0 });
  });
});
