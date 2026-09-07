import type { Stage } from "@/lib/stages";

/**
 * Stage-driven next actions (ADR 0019): the obvious thing(s) to do per stage,
 * shown on the current rung of the candidate journey. Pure policy — the
 * RungActions component maps keys to real dialogs/server actions.
 *
 * Deliberately NOT here:
 *  - retry/manual scoring (lives inside the intake ScoringTab content)
 *  - send test (lives inside the evaluating AssessmentsTab content)
 *  - approve/decline steps (live inside the approving ApprovalsTab content)
 *  - compose offer email (rendered server-side into the offer block)
 *
 * Every open stage names at least one action (renovation R1 — previously 11 of
 * 16 stages offered only "reject" or, for managers, nothing).
 */
export type NextActionKey =
  | "schedule_interview"
  | "start_approval"
  | "mark_hired"
  | "reject"
  | "withdraw";

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
    case "intake":
      if (canOperate)
        actions.push({ key: "schedule_interview", label: "Đặt lịch phỏng vấn", primary: true });
      break;
    case "evaluating":
      if (canPropose)
        actions.push({ key: "start_approval", label: "Đề xuất tuyển", primary: true });
      if (canOperate) actions.push({ key: "schedule_interview", label: "Phỏng vấn vòng nữa" });
      break;
    case "offer_accepted":
      if (canOperate)
        actions.push({ key: "mark_hired", label: "Xác nhận đã tuyển", primary: true });
      break;
    // approving / offer: the primary action lives in the tab content
    // (approve-decide / compose-offer), so no journey button — only the
    // quiet reject + withdraw below.
    default:
      break;
  }

  // Reject + withdraw are available to HR/admin while the record is open —
  // deliberately quiet (secondary; reject opens the reason picker).
  const CLOSED: Stage[] = ["hired", "rejected", "withdrew"];
  if (canOperate && !CLOSED.includes(stage)) {
    actions.push({ key: "reject", label: "Từ chối" });
    actions.push({ key: "withdraw", label: "Ứng viên rút hồ sơ" });
  }
  return actions;
}
