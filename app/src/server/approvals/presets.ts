/**
 * Hardcoded approval presets per ADR + master plan §40.
 *
 * Two flow_types map to ordered step lists. Each step is an approval_step_kind
 * enum value (matches Postgres). We don't model dynamic workflows — admin
 * can't reorder steps from the UI. This is intentional simplicity for v1.
 */
import type { Database } from "@/types/db";

export type FlowType = Database["public"]["Enums"]["flow_type"];
export type StepKind = Database["public"]["Enums"]["approval_step_kind"];

/**
 * Preset step orders (streamlined per ADR 0015, Sanh 2026-07-06).
 *
 * staff (1 step): clicking "Đề xuất tuyển" IS the HR recommendation — the
 *   only real decision left is the manager's. Salary gets recorded when the
 *   offer email is composed (composer auto-fills {{salary}}), not as an
 *   approval step.
 *
 * management (3 steps): manager → BOD → Tập đoàn.
 *
 * `hr_recommend` and `salary_deal` remain in the enum/labels so legacy
 * in-flight chains keep rendering and stay decidable — new chains simply
 * never create them.
 */
export const APPROVAL_PRESETS: Record<FlowType, StepKind[]> = {
  staff: ["manager_recommend"],
  management: ["manager_recommend", "bod", "tap_doan"],
};

/** Vietnamese display label per step. Mirrors t.approvalStep but importable from server. */
export const STEP_LABEL_VI: Record<StepKind, string> = {
  hr_recommend: "HR đề xuất",
  manager_recommend: "Trưởng phòng đề xuất",
  salary_deal: "HR deal lương",
  bod: "BOD duyệt",
  tap_doan: "Quản lý Tập đoàn duyệt",
};

// STAGE_FOR_PENDING_STEP is gone (renovation R1): every pending step now maps
// to the single `approving` stage; which step is pending is DERIVED sub-state
// (deriveCandidateStatus reads the lowest pending approvals row).
