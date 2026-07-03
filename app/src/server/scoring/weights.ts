/**
 * Weights helpers — pure functions, no IO.
 *
 * Job weights are stored as numbers 0..1 summing to 1.0 (plus tolerance).
 * The Pass-2 score is per-criterion 0..100. Weighted total = Σ score × weight.
 */
import {
  CRITERION_CODES,
  type CriterionCode,
  type Weights,
  type VerifiedCriteria,
} from "@/lib/ai/gemini/types";

const SUM_TOLERANCE = 0.001;

export function isValidWeights(value: unknown): value is Weights {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  let sum = 0;
  for (const k of CRITERION_CODES) {
    const w = v[k];
    if (typeof w !== "number" || !Number.isFinite(w) || w < 0 || w > 1) return false;
    sum += w;
  }
  return Math.abs(sum - 1) <= SUM_TOLERANCE;
}

/** Coerce a Json blob into a Weights object, falling back to even split if invalid. */
export function readWeights(raw: unknown): Weights {
  if (isValidWeights(raw)) return raw;
  const even = 1 / CRITERION_CODES.length;
  return Object.fromEntries(CRITERION_CODES.map((k) => [k, even])) as Weights;
}

/**
 * Σ scores[k] × weights[k]. Inputs not in CRITERION_CODES are ignored.
 * Returns 0..100, rounded to 2 decimals to match numeric column scale.
 */
export function computeWeightedTotal(
  scores: Record<CriterionCode, { score: number }>,
  weights: Weights,
): number {
  let total = 0;
  for (const k of CRITERION_CODES) {
    const s = scores[k]?.score ?? 0;
    total += s * (weights[k] ?? 0);
  }
  return Math.round(total * 100) / 100;
}

/** Convenience for the verified shape produced by the scoring worker. */
export function computeWeightedTotalFromVerified(
  criteria: VerifiedCriteria,
  weights: Weights,
): number {
  return computeWeightedTotal(criteria, weights);
}

/**
 * Anti-bluff discount (found by the VDK test set, 2026-07-03): a keyword-stuffed
 * CV with zero substantiated claims scored 69.5 because evidence verification
 * was informational-only. Now it ENFORCES:
 * - a quote only counts as substantive evidence if it verified against the CV
 *   text AND is ≥ MIN_EVIDENCE_CHARS (kills two-word freebies like "Bán hàng")
 * - a criterion scored above UNSUBSTANTIATED_CAP with no substantive evidence
 *   is capped at UNSUBSTANTIATED_CAP, with the reasoning annotated so HR sees why.
 * Matches the rubric's "thiếu thông tin: chấm 30–50" guidance.
 */
export const UNSUBSTANTIATED_CAP = 45;
export const MIN_EVIDENCE_CHARS = 15;

export function applyEvidenceDiscount(criteria: VerifiedCriteria): VerifiedCriteria {
  const out = {} as VerifiedCriteria;
  for (const k of CRITERION_CODES) {
    const c = criteria[k];
    if (!c) continue;
    const substantive = (c.evidence_quotes ?? []).filter(
      (q) => q.verified && q.text.trim().length >= MIN_EVIDENCE_CHARS,
    );
    if (c.score > UNSUBSTANTIATED_CAP && substantive.length === 0) {
      out[k] = {
        ...c,
        score: UNSUBSTANTIATED_CAP,
        reasoning: `${c.reasoning} (Điểm bị giới hạn còn ${UNSUBSTANTIATED_CAP} vì không có trích dẫn bằng chứng nào xác thực được từ nội dung CV.)`,
      };
    } else {
      out[k] = c;
    }
  }
  return out;
}
