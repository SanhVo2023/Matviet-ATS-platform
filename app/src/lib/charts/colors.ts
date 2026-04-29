/**
 * Chart palette — keep in sync with the kanban + score card from G4/G5.
 * Tailwind hex values picked to look right on the white card background
 * and remain legible when monochrome-printed via PDF export.
 */

export const CHART_COLORS = {
  navy: "#13245C", // brand-navy
  yellow: "#FFC107", // brand-yellow
  primary: "#2563EB", // tailwind blue-600
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#EF4444",
  slate: "#64748B",
  mutedNavy: "#3B5A99",
  mutedYellow: "#FFE082",
} as const;

/**
 * Sequence used for "more series than there are roles" — picked for
 * accessibility (keeps minimum contrast against white) and consistent
 * order so the same role family always lands on the same color.
 */
export const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.rose,
  CHART_COLORS.slate,
  CHART_COLORS.mutedNavy,
];

/** Score bucket → color band — same thresholds as ScoreCard. */
export function scoreBucketColor(bucketLower: number): string {
  if (bucketLower >= 80) return CHART_COLORS.emerald;
  if (bucketLower >= 60) return CHART_COLORS.amber;
  if (bucketLower >= 40) return "#EAB308"; // yellow-700
  return CHART_COLORS.rose;
}

/** Funnel super-stage → color (deterministic). */
export const FUNNEL_SUPER_COLOR: Record<string, string> = {
  applied: CHART_COLORS.slate,
  screening: CHART_COLORS.primary,
  interview: CHART_COLORS.mutedNavy,
  approval: CHART_COLORS.amber,
  offer: CHART_COLORS.emerald,
  hired: "#059669", // emerald-700
  rejected: CHART_COLORS.rose,
};
