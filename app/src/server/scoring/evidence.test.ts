import { describe, expect, test } from "vitest";
import { synthesizeRawText, validateEvidence } from "./evidence";
import type { CriterionCode, ScoreResult } from "@/lib/ai/gemini/types";

const CV_TEXT = `Nguyễn Văn A. TP. Hồ Chí Minh.
Nhân viên bán hàng tại Mắt Việt từ 2022. Đạt KPI 120% năm 2024.
Tốt nghiệp Đại học Kinh tế TPHCM.
Kỹ năng: bán lẻ, tư vấn khách hàng, xử lý khiếu nại.`;

function makeScore(criterion: CriterionCode, quotes: string[]): ScoreResult {
  const empty = { score: 0, reasoning: "", evidence_quotes: [] as string[] };
  const map: Record<CriterionCode, typeof empty> = {
    industry_fit: empty,
    professional_skills: empty,
    work_experience: empty,
    years_experience: empty,
    education: empty,
    location: empty,
  };
  map[criterion] = { score: 80, reasoning: "test", evidence_quotes: quotes };
  return { per_criterion: map, overall_summary: "" };
}

describe("validateEvidence", () => {
  test("verifies an exact substring match", () => {
    const scored = makeScore("work_experience", ["Đạt KPI 120% năm 2024"]);
    const out = validateEvidence(scored, CV_TEXT);
    expect(out.work_experience.evidence_quotes[0]?.verified).toBe(true);
  });

  test("verifies a near-fuzzy match (case + whitespace differences)", () => {
    const scored = makeScore("work_experience", ["nhân  viên  bán hàng tại MẮT VIỆT từ 2022"]);
    const out = validateEvidence(scored, CV_TEXT);
    expect(out.work_experience.evidence_quotes[0]?.verified).toBe(true);
  });

  test("flags a hallucinated quote that doesn't appear in the CV", () => {
    const scored = makeScore("industry_fit", ["Tôi từng làm CEO tại Apple"]);
    const out = validateEvidence(scored, CV_TEXT);
    expect(out.industry_fit.evidence_quotes[0]?.verified).toBe(false);
  });

  test("preserves original quote text on output (verified or not)", () => {
    const original = "Tôi không có trong CV";
    const scored = makeScore("location", [original]);
    const out = validateEvidence(scored, CV_TEXT);
    expect(out.location.evidence_quotes[0]?.text).toBe(original);
  });

  test("Vietnamese diacritics survive normalization", () => {
    const scored = makeScore("education", ["tốt nghiệp đại học kinh tế tphcm"]);
    const out = validateEvidence(scored, CV_TEXT);
    expect(out.education.evidence_quotes[0]?.verified).toBe(true);
  });
});

describe("synthesizeRawText", () => {
  test("concatenates CV fields into a search-friendly string", () => {
    const text = synthesizeRawText({
      personal: { full_name: "Nguyễn Văn A", location: "TPHCM" },
      experience: [
        { company: "Mắt Việt", title: "Nhân viên bán hàng", description: "Bán lẻ kính mắt" },
      ],
      education: [{ institution: "ĐH Kinh tế", degree: "Cử nhân", field: "QTKD" }],
      skills: ["bán lẻ", "tư vấn"],
      languages: [{ name: "Tiếng Anh" }],
      certifications: [],
    });
    expect(text).toContain("Nguyễn Văn A");
    expect(text).toContain("Mắt Việt");
    expect(text).toContain("bán lẻ");
    expect(text).toContain("ĐH Kinh tế");
  });
});
