import type { FunnelSuperStage, Stage } from "./types";

/** All 8 pipeline stages in canonical order (renovation R1). */
export const ALL_STAGES: Stage[] = [
  "intake",
  "evaluating",
  "approving",
  "offer",
  "offer_accepted",
  "hired",
  "rejected",
  "withdrew",
];

/**
 * Stages collapse into funnel supersets. `intake` IS the applied bucket now
 * (AI screening is sub-state, not a stage). The tooltip exposes the count.
 */
export const STAGE_TO_SUPER: Record<Stage, FunnelSuperStage> = {
  intake: "applied",
  evaluating: "interview",
  approving: "approval",
  offer: "offer",
  offer_accepted: "offer",
  hired: "hired",
  rejected: "rejected",
  withdrew: "rejected",
};

/**
 * Adjacent-stage pairs used by the conversion chart. Skips the terminal
 * branches (`rejected`, `withdrew`) — dead ends, not conversions.
 *
 * NOTE: a candidate taking the intake→approving skip path (kanban drag past
 * evaluating) won't be counted as crossing evaluating, so that conversion
 * reads slightly low. Acceptable for a low-volume internal funnel.
 */
export const ORDERED_STAGE_PAIRS: Array<[Stage, Stage]> = [
  ["intake", "evaluating"],
  ["evaluating", "approving"],
  ["approving", "offer"],
  ["offer", "offer_accepted"],
  ["offer_accepted", "hired"],
];
