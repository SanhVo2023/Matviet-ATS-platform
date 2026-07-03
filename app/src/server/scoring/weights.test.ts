import { describe, expect, test } from "vitest";
import { computeWeightedTotal, isValidWeights, readWeights } from "./weights";
import type { CriterionCode, Weights } from "@/lib/ai/gemini/types";

const evenWeights: Weights = {
  industry_fit: 1 / 6,
  professional_skills: 1 / 6,
  work_experience: 1 / 6,
  years_experience: 1 / 6,
  education: 1 / 6,
  location: 1 / 6,
};

const salesWeights: Weights = {
  industry_fit: 0.2,
  professional_skills: 0.2,
  work_experience: 0.2,
  years_experience: 0.15,
  education: 0.1,
  location: 0.15,
};

function uniformScores(score: number): Record<CriterionCode, { score: number }> {
  return {
    industry_fit: { score },
    professional_skills: { score },
    work_experience: { score },
    years_experience: { score },
    education: { score },
    location: { score },
  };
}

describe("isValidWeights", () => {
  test("accepts a valid weights object summing to 1", () => {
    expect(isValidWeights(salesWeights)).toBe(true);
  });
  test("accepts even weights within tolerance", () => {
    expect(isValidWeights(evenWeights)).toBe(true);
  });
  test("rejects weights that sum to ≠ 1", () => {
    const bad = { ...salesWeights, industry_fit: 0.5 };
    expect(isValidWeights(bad)).toBe(false);
  });
  test("rejects weights with a missing key", () => {
    const partial: Record<string, number> = { ...salesWeights };
    delete partial.location;
    expect(isValidWeights(partial)).toBe(false);
  });
  test("rejects weights with a negative value", () => {
    expect(isValidWeights({ ...salesWeights, location: -0.1 })).toBe(false);
  });
});

describe("readWeights", () => {
  test("returns the input when valid", () => {
    expect(readWeights(salesWeights)).toEqual(salesWeights);
  });
  test("falls back to even split for invalid input", () => {
    const got = readWeights({ industry_fit: 0.5 });
    expect(got).toEqual(evenWeights);
  });
  test("falls back for null", () => {
    expect(readWeights(null)).toEqual(evenWeights);
  });
});

describe("computeWeightedTotal", () => {
  test("uniform scores return that score regardless of weights distribution", () => {
    expect(computeWeightedTotal(uniformScores(80), salesWeights)).toBe(80);
    expect(computeWeightedTotal(uniformScores(45), evenWeights)).toBe(45);
  });
  test("respects per-criterion weights", () => {
    const scores: Record<CriterionCode, { score: number }> = {
      industry_fit: { score: 100 },
      professional_skills: { score: 0 },
      work_experience: { score: 0 },
      years_experience: { score: 0 },
      education: { score: 0 },
      location: { score: 0 },
    };
    // 100 × 0.2 = 20
    expect(computeWeightedTotal(scores, salesWeights)).toBe(20);
  });
  test("rounds to 2 decimals", () => {
    const scores: Record<CriterionCode, { score: number }> = {
      industry_fit: { score: 33 },
      professional_skills: { score: 67 },
      work_experience: { score: 50 },
      years_experience: { score: 50 },
      education: { score: 50 },
      location: { score: 50 },
    };
    const got = computeWeightedTotal(scores, salesWeights);
    // Should be a number with at most 2 decimal places
    expect(Math.round(got * 100) / 100).toBe(got);
  });
});

// --- applyEvidenceDiscount (anti-bluff cap, added after the VDK test set) ---
import { applyEvidenceDiscount, UNSUBSTANTIATED_CAP } from "./weights";
import type { VerifiedCriteria } from "@/lib/ai/gemini/types";

function verifiedCriteria(
  score: number,
  quotes: Array<{ text: string; verified: boolean }>,
): VerifiedCriteria {
  const one = { score, reasoning: "test", evidence_quotes: quotes };
  return {
    industry_fit: one,
    professional_skills: one,
    work_experience: one,
    years_experience: one,
    education: one,
    location: one,
  };
}

describe("applyEvidenceDiscount", () => {
  test("caps high scores with zero verified quotes", () => {
    const out = applyEvidenceDiscount(
      verifiedCriteria(80, [{ text: "tuyên bố chung chung không xác thực", verified: false }]),
    );
    expect(out.industry_fit.score).toBe(UNSUBSTANTIATED_CAP);
    expect(out.industry_fit.reasoning).toContain("giới hạn");
  });

  test("trivially short verified quotes do not count as evidence", () => {
    const out = applyEvidenceDiscount(verifiedCriteria(75, [{ text: "Bán hàng", verified: true }]));
    expect(out.professional_skills.score).toBe(UNSUBSTANTIATED_CAP);
  });

  test("keeps high scores backed by substantive verified evidence", () => {
    const out = applyEvidenceDiscount(
      verifiedCriteria(88, [
        { text: "4 năm tư vấn kính mắt cao cấp tại Takashimaya", verified: true },
      ]),
    );
    expect(out.industry_fit.score).toBe(88);
    expect(out.industry_fit.reasoning).not.toContain("giới hạn");
  });

  test("leaves low scores untouched regardless of evidence", () => {
    const out = applyEvidenceDiscount(verifiedCriteria(30, []));
    expect(out.education.score).toBe(30);
  });
});
