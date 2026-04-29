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
 * Preset step orders.
 *
 * staff (3 steps): HR proposes → manager proposes → HR negotiates salary
 *   → final offer is fired by HR after the salary_deal step approves.
 *
 * management (4 steps): HR + manager → BOD → Tập đoàn → final offer.
 *   Salary negotiation is folded into the BOD/Tap đoàn discussion since
 *   management hires don't follow standard payband.
 */
export const APPROVAL_PRESETS: Record<FlowType, StepKind[]> = {
  staff: ["hr_recommend", "manager_recommend", "salary_deal"],
  management: ["hr_recommend", "manager_recommend", "bod", "tap_doan"],
};

/** Vietnamese display label per step. Mirrors t.approvalStep but importable from server. */
export const STEP_LABEL_VI: Record<StepKind, string> = {
  hr_recommend: "HR đề xuất",
  manager_recommend: "Trưởng phòng đề xuất",
  salary_deal: "HR deal lương",
  bod: "BOD duyệt",
  tap_doan: "Quản lý Tập đoàn duyệt",
};

/**
 * Derive the candidate stage to land in WHILE a given step is the active
 * pending step. Used so the kanban + list views show the right column.
 */
export const STAGE_FOR_PENDING_STEP: Record<
  StepKind,
  Database["public"]["Enums"]["pipeline_stage"]
> = {
  hr_recommend: "recommended",
  manager_recommend: "recommended",
  salary_deal: "salary_deal",
  bod: "bod_review",
  tap_doan: "tap_doan_review",
};
