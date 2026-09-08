/**
 * ONE stage language (ADR 0019): the single source of truth for how a
 * candidate's pipeline state LOOKS anywhere in the app — kanban, candidate
 * table, journey ladder, dashboard, timeline. Colors key off the 4 business
 * groups (lib/validation/candidate.ts STAGE_GROUPS) and the derived status
 * tone (deriveCandidateStatus) — never off raw stages.
 *
 * Tints use the SEMANTIC tokens (success / warning / info / error) so the ATS
 * and the HRM share one status vocabulary (UX audit 2026-09-08). Group icons
 * are lucide — no emoji — so the vocabulary renders identically on every OS.
 *
 * The reports funnel keeps its own ANALYTIC grouping on purpose (documented
 * exception in ADR 0019).
 */
import {
  Inbox,
  MessagesSquare,
  Handshake,
  PartyPopper,
  Archive,
  type LucideIcon,
} from "lucide-react";
import { groupOfStage } from "@/lib/validation/candidate";
import type { Stage } from "@/lib/stages";
import type { StatusTone } from "@/lib/candidate-status";

/** Status dot — ALWAYS paired with a text label next to it (color-blind safe). */
export const READINESS_DOT: Record<StatusTone, string> = {
  ready: "bg-success",
  waiting: "bg-slate-300",
  blocked: "bg-error",
  done: "bg-success-fg ring-2 ring-success-bg",
};

export const READINESS_TEXT: Record<StatusTone, string> = {
  ready: "text-success-fg",
  waiting: "text-slate-500",
  blocked: "text-error-fg",
  done: "text-success-fg",
};

/** Badge/pill tint per business group — matches the kanban column accents. */
export const GROUP_TINT: Record<string, string> = {
  g_intake: "bg-slate-100 text-slate-700",
  g_eval: "bg-warning-bg text-warning-fg",
  g_offer: "bg-info-bg text-info-fg",
  g_onboard: "bg-success-bg text-success-fg",
  g_closed: "bg-error-bg text-error-fg",
};

/** Column/section top-border accent per business group. */
export const GROUP_ACCENT: Record<string, string> = {
  g_intake: "border-slate-400",
  g_eval: "border-warning",
  g_offer: "border-info",
  g_onboard: "border-success",
  g_closed: "border-error",
};

/** Lucide icon per business group (replaces the emoji column markers). */
export const GROUP_ICON: Record<string, LucideIcon> = {
  g_intake: Inbox,
  g_eval: MessagesSquare,
  g_offer: Handshake,
  g_onboard: PartyPopper,
  g_closed: Archive,
};

export function groupTintOf(stage: Stage): string {
  return GROUP_TINT[groupOfStage(stage).id] ?? "bg-slate-100 text-slate-700";
}

/**
 * Verdict band boundaries — shared with the agent's invite floor
 * (agent-flows/events.ts): the agent only auto-proposes interviews for
 * candidates the UI labels at least "Phù hợp trung bình".
 */
export const SCORE_BAND_HIGH_MIN = 75;
export const SCORE_BAND_MEDIUM_MIN = 55;

/** Plain-language AI score verdict bands (2026-07-08 scoring redesign). */
export function scoreVerdict(total: number): { label: string; className: string } {
  if (total >= SCORE_BAND_HIGH_MIN)
    return { label: "Phù hợp cao", className: "bg-success-bg text-success-fg" };
  if (total >= SCORE_BAND_MEDIUM_MIN)
    return { label: "Phù hợp trung bình", className: "bg-warning-bg text-warning-fg" };
  return { label: "Phù hợp thấp", className: "bg-error-bg text-error-fg" };
}
