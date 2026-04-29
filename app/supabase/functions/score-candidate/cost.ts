// Mirror of app/src/lib/ai/gemini/cost.ts (Deno-compatible).

export const GEMINI_PRICING: Record<string, { in: number; out: number }> = {
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
  "gemini-2.5-pro": { in: 1.25, out: 10.0 },
};

export function computeCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = GEMINI_PRICING[model];
  if (!p) return 0;
  const cost = (tokensIn / 1_000_000) * p.in + (tokensOut / 1_000_000) * p.out;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
