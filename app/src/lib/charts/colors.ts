/**
 * Chart palette — design-language family (docs/design-language.md §2).
 * Navy is the backbone (sequential ramps run through the brand scale),
 * gold is the signature accent; status colors carry semantic meaning.
 * Values picked to look right on the white card background and remain
 * legible when monochrome-printed via PDF export.
 */
import type { CSSProperties } from "react";

export const CHART_COLORS = {
  navy: "#0b1430", // brand-900 (chrome)
  yellow: "#fbc312", // accent-400 (signature gold)
  primary: "#2f4a8f", // brand-500
  emerald: "#12a05f", // success
  amber: "#ef7a00", // warning
  rose: "#e0413a", // danger
  slate: "#93a9de", // brand-300 (light navy tint — neutral series)
  mutedNavy: "#1d3061", // brand-700
  mutedYellow: "#fce78d", // accent-200
} as const;

/**
 * Categorical sequence used for "more series than there are roles" —
 * design-language order: brand-500 → gold → brand-300 → success →
 * warning → brand-700, extended with tints. Consistent order so the
 * same role family always lands on the same color.
 */
export const CHART_PALETTE = [
  CHART_COLORS.primary, // #2f4a8f brand-500
  CHART_COLORS.yellow, // #fbc312 gold
  CHART_COLORS.slate, // #93a9de brand-300
  CHART_COLORS.emerald, // #12a05f success
  CHART_COLORS.amber, // #ef7a00 warning
  CHART_COLORS.mutedNavy, // #1d3061 brand-700
  "#5f7cc0", // brand-400 tint
  CHART_COLORS.mutedYellow, // #fce78d gold tint
];

/** Recharts cosmetics — shared across report charts (design-language tokens). */
export const CHART_GRID_STROKE = "#e6e9f2"; // slate-200 border
export const CHART_TICK_FILL = "#667192"; // ink-muted

/** White raised tooltip card, rounded-xl, token border. */
export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e6e9f2",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(11, 20, 48, 0.09), 0 4px 8px rgba(11, 20, 48, 0.05)",
  fontSize: 12,
  color: "#11183a",
};

/** Score bucket → color band — same thresholds as ScoreCard. */
export function scoreBucketColor(bucketLower: number): string {
  if (bucketLower >= 80) return CHART_COLORS.emerald; // success
  if (bucketLower >= 60) return CHART_COLORS.yellow; // gold
  if (bucketLower >= 40) return CHART_COLORS.amber; // warning
  return CHART_COLORS.rose; // danger
}

/** Funnel super-stage → color (deterministic navy ramp + status ends). */
export const FUNNEL_SUPER_COLOR: Record<string, string> = {
  applied: "#93a9de", // brand-300
  screening: "#5f7cc0", // brand-400
  interview: "#2f4a8f", // brand-500
  approval: CHART_COLORS.yellow, // gold — awaiting decision
  offer: CHART_COLORS.emerald, // success
  hired: "#0b6e41", // success-fg (deep green)
  rejected: CHART_COLORS.rose, // danger
};
