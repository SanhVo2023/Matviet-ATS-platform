// Mirror of app/src/server/scoring/weights.ts (Deno-compatible imports).

import {
  CRITERION_CODES,
  type CriterionCode,
  type VerifiedCriteria,
  type Weights,
} from "./types.ts";

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

export function readWeights(raw: unknown): Weights {
  if (isValidWeights(raw)) return raw;
  const even = 1 / CRITERION_CODES.length;
  return Object.fromEntries(CRITERION_CODES.map((k) => [k, even])) as Weights;
}

export function computeWeightedTotal(
  scores: Record<CriterionCode, { score: number }>,
  weights: Weights,
): number {
  let total = 0;
  for (const k of CRITERION_CODES) {
    total += (scores[k]?.score ?? 0) * (weights[k] ?? 0);
  }
  return Math.round(total * 100) / 100;
}

export function computeWeightedTotalFromVerified(
  criteria: VerifiedCriteria,
  weights: Weights,
): number {
  return computeWeightedTotal(criteria, weights);
}
