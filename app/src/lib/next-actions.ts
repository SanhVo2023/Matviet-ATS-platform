import type { Stage } from "@/lib/validation/candidate";

/**
 * Stage-driven next actions (ADR 0019): ONE obvious thing to do per stage,
 * shown on the current rung of the candidate journey. Pure policy — the
 * RungActions component maps keys to real dialogs/server actions.
 *
 * Deliberately NOT here:
 *  - retry/manual scoring (lives inside the rung-1 ScoringTab content)
 *  - send test (lives inside the rung-2 AssessmentsTab content)
 *  - approve/decline steps (live inside the rung-3 ApprovalsTab content)
 *  - compose offer email (rendered server-side into the rung-3 offer block)
 */
export type NextActionKey = "schedule_interview" | "start_approval" | "mark_hired" | "reject";

export interface NextAction {
  key: NextActionKey;
  label: string;
  primary?: boolean;
}

type Role = "admin" | "hr" | "hiring_manager" | "bod" | "tap_doan";

export function nextActionsFor(stage: Stage, role: Role): NextAction[] {
  const canOperate = role === "admin" || role === "hr"; // scheduling, reject
  const canPropose = canOperate || role === "hiring_manager"; // start approval

  const actions: NextAction[] = [];
  switch (stage) {
    case "screened":
      if (canOperate)
        actions.push({ key: "schedule_interview", label: "Đặt lịch phỏng vấn", primary: true });
      break;
    case "interview_scheduled":
      if (canOperate) actions.push({ key: "schedule_interview", label: "Đặt thêm lịch" });
      break;
    case "interviewed":
    case "test_done":
      if (canPropose)
        actions.push({ key: "start_approval", label: "Đề xuất tuyển", primary: true });
      if (canOperate) actions.push({ key: "schedule_interview", label: "Phỏng vấn vòng nữa" });
      break;
    case "offer_accepted":
      if (canOperate)
        actions.push({ key: "mark_hired", label: "Xác nhận đã tuyển", primary: true });
      break;
    default:
      break;
  }

  // Reject is always available to HR/admin while the record is open —
  // deliberately quiet (secondary + confirm step).
  const CLOSED: Stage[] = ["hired", "rejected", "withdrew"];
  if (canOperate && !CLOSED.includes(stage)) {
    actions.push({ key: "reject", label: "Từ chối" });
  }
  return actions;
}
