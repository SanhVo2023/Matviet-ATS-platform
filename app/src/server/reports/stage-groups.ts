import type { FunnelSuperStage, Stage } from "./types";

/** All 16 pipeline stages in canonical order. */
export const ALL_STAGES: Stage[] = [
  "new",
  "screening",
  "screened",
  "interview_scheduled",
  "interviewed",
  "test_sent",
  "test_done",
  "recommended",
  "salary_deal",
  "bod_review",
  "tap_doan_review",
  "offer_sent",
  "offer_accepted",
  "hired",
  "rejected",
  "withdrew",
];

/**
 * 16 pipeline stages collapse into 7 supersets for the funnel chart. The
 * tooltip exposes the per-stage breakdown.
 */
export const STAGE_TO_SUPER: Record<Stage, FunnelSuperStage> = {
  new: "applied",
  screening: "screening",
  screened: "screening",
  interview_scheduled: "interview",
  interviewed: "interview",
  test_sent: "interview",
  test_done: "interview",
  recommended: "approval",
  salary_deal: "approval",
  bod_review: "approval",
  tap_doan_review: "approval",
  offer_sent: "offer",
  offer_accepted: "offer",
  hired: "hired",
  rejected: "rejected",
  withdrew: "rejected",
};

/**
 * Adjacent-stage pairs used by the conversion chart. Skips the terminal
 * branches (`rejected`, `withdrew`) — those are dead ends, not conversions.
 */
export const ORDERED_STAGE_PAIRS: Array<[Stage, Stage]> = [
  ["new", "screening"],
  ["screening", "screened"],
  ["screened", "interview_scheduled"],
  ["interview_scheduled", "interviewed"],
  ["interviewed", "test_sent"],
  ["test_sent", "test_done"],
  ["test_done", "recommended"],
  ["recommended", "salary_deal"],
  ["salary_deal", "bod_review"],
  ["bod_review", "tap_doan_review"],
  ["tap_doan_review", "offer_sent"],
  ["offer_sent", "offer_accepted"],
  ["offer_accepted", "hired"],
];
