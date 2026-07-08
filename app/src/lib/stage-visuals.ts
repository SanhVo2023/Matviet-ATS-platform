/**
 * ONE stage language (ADR 0019): the single source of truth for how a
 * candidate's pipeline state LOOKS anywhere in the app — kanban, candidate
 * table, journey ladder, dashboard, timeline. Colors key off the 4 business
 * groups (lib/validation/candidate.ts STAGE_GROUPS) and the readiness tone
 * (stageReadiness) — never off the 16 raw stages.
 *
 * The reports funnel keeps its own 7-bucket ANALYTIC grouping on purpose
 * (documented exception in ADR 0019).
 */
import { groupOfStage, type ReadinessTone, type Stage } from "@/lib/validation/candidate";

/** Status dot — ALWAYS paired with a text label next to it (color-blind safe). */
export const READINESS_DOT: Record<ReadinessTone, string> = {
  ready: "bg-emerald-500",
  waiting: "bg-slate-300",
  blocked: "bg-rose-500",
  done: "bg-emerald-600 ring-2 ring-emerald-200",
};

export const READINESS_TEXT: Record<ReadinessTone, string> = {
  ready: "text-emerald-700",
  waiting: "text-slate-500",
  blocked: "text-rose-600",
  done: "text-emerald-700",
};

/** Badge/pill tint per business group — matches the kanban column accents. */
export const GROUP_TINT: Record<string, string> = {
  g_intake: "bg-slate-100 text-slate-700",
  g_eval: "bg-amber-50 text-amber-800",
  g_offer: "bg-indigo-50 text-indigo-700",
  g_onboard: "bg-emerald-50 text-emerald-700",
  g_closed: "bg-rose-50 text-rose-700",
};

/** Column/section top-border accent per business group. */
export const GROUP_ACCENT: Record<string, string> = {
  g_intake: "border-slate-400",
  g_eval: "border-amber-400",
  g_offer: "border-indigo-400",
  g_onboard: "border-emerald-500",
  g_closed: "border-rose-400",
};

export function groupTintOf(stage: Stage): string {
  return GROUP_TINT[groupOfStage(stage).id] ?? "bg-slate-100 text-slate-700";
}

/** Plain-language AI score verdict bands (2026-07-08 scoring redesign). */
export function scoreVerdict(total: number): { label: string; className: string } {
  if (total >= 75) return { label: "Phù hợp cao", className: "bg-emerald-100 text-emerald-800" };
  if (total >= 55) return { label: "Phù hợp trung bình", className: "bg-amber-100 text-amber-800" };
  return { label: "Phù hợp thấp", className: "bg-rose-100 text-rose-700" };
}
