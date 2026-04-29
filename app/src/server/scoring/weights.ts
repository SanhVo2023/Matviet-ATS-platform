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

/** Convenience for the verified shape produced by the Edge Function. */
export function computeWeightedTotalFromVerified(
  criteria: VerifiedCriteria,
  weights: Weights,
): number {
  return computeWeightedTotal(criteria, weights);
}
