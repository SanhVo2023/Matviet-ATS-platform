/**
 * THE pipeline stage vocabulary — single source of truth (renovation R1).
 *
 * Pure, client-safe, zero deps: imported by src/db/schema.ts (enum), server
 * services, and client components alike. Every other stage list re-exports
 * from here — never redeclare the enum.
 *
 * Collapsed 16 → 8 (2026-09): the old micro-stages (screening/screened,
 * interview_scheduled/interviewed/test_*, recommended/salary_deal/bod_review/
 * tap_doan_review) became SUB-STATE derived by deriveCandidateStatus() from
 * related rows (ai_screening_status, interviews, submissions, approvals,
 * offer_response). See candidate-status.ts.
 */

export const PIPELINE_STAGES = [
  "intake", // new CV in, AI screening (was: new, screening, screened)
  "evaluating", // interviews + tests (was: interview_scheduled, interviewed, test_sent, test_done)
  "approving", // approval chain running (was: recommended, salary_deal, bod_review, tap_doan_review)
  "offer", // approved, offer out (was: offer_sent)
  "offer_accepted", // candidate accepted, HR confirms → hired
  "hired",
  "rejected",
  "withdrew",
] as const;

export type Stage = (typeof PIPELINE_STAGES)[number];

export const REJECTION_REASONS = [
  "screened_out", // not a fit on the CV/screen
  "not_approved", // an approver declined
  "offer_declined", // candidate declined the offer (≠ we rejected them)
  "withdrawn_by_us", // pulled the role / position closed
  "other",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

/** Terminal stages — no outgoing transitions (hired is quasi-terminal, see below). */
export const TERMINAL_STAGES: readonly Stage[] = ["rejected", "withdrew"];

/**
 * Explicit allowed transitions — replaces the old "anything → anything" guard.
 * `approving → evaluating` is a correction that cancels the pending approval
 * chain (see transitionStage); `intake → approving` is the kanban skip path.
 */
export const ALLOWED_TRANSITIONS: Record<Stage, readonly Stage[]> = {
  intake: ["evaluating", "approving", "rejected", "withdrew"],
  evaluating: ["intake", "approving", "rejected", "withdrew"],
  approving: ["evaluating", "offer", "rejected", "withdrew"],
  offer: ["offer_accepted", "rejected", "withdrew"],
  offer_accepted: ["hired", "rejected", "withdrew"],
  hired: ["withdrew"], // rare reversal
  rejected: [],
  withdrew: [],
};

export function allowedNextStages(current: Stage): Stage[] {
  return [...ALLOWED_TRANSITIONS[current]];
}

export function isValidTransition(from: Stage, to: Stage): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Old-stage → new-stage map. The 0008 data migration's CASE mirrors this
 * (kept in sync by stage-migration-map.test.ts). Also used by any legacy code
 * path that still receives an old value.
 */
export const LEGACY_STAGE_MAP: Record<string, Stage> = {
  new: "intake",
  screening: "intake",
  screened: "intake",
  interview_scheduled: "evaluating",
  interviewed: "evaluating",
  test_sent: "evaluating",
  test_done: "evaluating",
  recommended: "approving",
  salary_deal: "approving",
  bod_review: "approving",
  tap_doan_review: "approving",
  offer_sent: "offer",
  offer_accepted: "offer_accepted",
  hired: "hired",
  rejected: "rejected",
  withdrew: "withdrew",
};

/** Map a possibly-legacy stage string to the current enum (identity for new values). */
export function normalizeStage(s: string): Stage {
  return (LEGACY_STAGE_MAP[s] ?? s) as Stage;
}
