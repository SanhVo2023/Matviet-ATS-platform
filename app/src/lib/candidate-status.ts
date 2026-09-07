/**
 * deriveCandidateStatus — THE single status computation (renovation R1).
 *
 * With the 16→8 collapse, a candidate's fine-grained situation is no longer
 * encoded in a micro-stage; it is DERIVED from the coarse stage + related
 * rows. One function feeds the kanban card, the table, the journey ladder, the
 * exec queue and the dashboard, so "waiting on whom, for how long" is
 * consistent everywhere. Pure + client-safe (inject `now` for tests).
 *
 * Replaces the old stageReadiness / STAGE_READINESS maps.
 */
import type { Stage } from "@/lib/stages";
import { APPROVAL_STEP_KINDS } from "@/db/schema";

export type WaitingOn = "hr" | "manager" | "candidate" | "bod" | "tap_doan" | "ai" | null;
export type StatusTone = "ready" | "waiting" | "blocked" | "done";

export interface DerivedStatus {
  stage: Stage;
  waitingOn: WaitingOn;
  daysWaiting: number;
  tone: StatusTone;
  label: string;
}

type ApprovalStepKind = (typeof APPROVAL_STEP_KINDS)[number];

export interface StatusInputs {
  current_stage: Stage;
  ai_screening_status?: "pending" | "success" | "failed" | null;
  ai_score?: number | null;
  offer_response?: "accepted" | "declined" | null;
  offer_token?: string | null;
  offer_token_expires_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
}

export interface StatusRelated {
  /** MAX(stage_history.at) for this candidate — the daysWaiting anchor. */
  lastStageChangeAt?: string | null;
  /** Next scheduled interview start (ISO), if any. */
  nextInterviewAt?: string | null;
  /** A completed interview exists but no evaluation yet. */
  awaitingEvaluation?: boolean;
  /** A test was sent but not submitted. */
  testAwaitingSubmission?: boolean;
  /** A test was submitted but not graded. */
  testAwaitingGrade?: boolean;
  /** Lowest still-pending approval step kind, or null when none pending. */
  pendingApprovalStep?: ApprovalStepKind | null;
  /** Injected clock (ms). Defaults to Date.now(). */
  now?: number;
}

const DAY_MS = 86_400_000;

function daysBetween(fromIso: string | null | undefined, now: number): number {
  if (!fromIso) return 0;
  const t = Date.parse(fromIso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / DAY_MS));
}

const REJECTION_LABEL: Record<string, string> = {
  screened_out: "Từ chối — không qua sàng lọc",
  not_approved: "Từ chối — không được duyệt",
  offer_declined: "Ứng viên từ chối offer",
  withdrawn_by_us: "Đóng vị trí / rút đề nghị",
  other: "Từ chối",
};

const STEP_WAITING: Record<ApprovalStepKind, { waitingOn: WaitingOn; label: string }> = {
  hr_recommend: { waitingOn: "hr", label: "HR đang đề xuất" },
  manager_recommend: { waitingOn: "manager", label: "Trưởng phòng đang duyệt" },
  salary_deal: { waitingOn: "hr", label: "Đang chốt lương" },
  bod: { waitingOn: "bod", label: "BOD đang duyệt" },
  tap_doan: { waitingOn: "tap_doan", label: "Tập đoàn đang duyệt" },
};

export function deriveCandidateStatus(c: StatusInputs, related: StatusRelated = {}): DerivedStatus {
  const now = related.now ?? Date.now();
  const stage = c.current_stage;

  // daysWaiting anchors on the last real stage change; for evaluating we
  // restart the clock at the latest concrete event so "waiting" is truthful.
  const baseAnchor = related.lastStageChangeAt ?? c.created_at ?? null;

  const make = (
    waitingOn: WaitingOn,
    tone: StatusTone,
    label: string,
    anchor: string | null = baseAnchor,
  ): DerivedStatus => ({
    stage,
    waitingOn,
    tone,
    label,
    daysWaiting: daysBetween(anchor, now),
  });

  switch (stage) {
    case "intake": {
      if (c.ai_screening_status === "pending") return make("ai", "waiting", "AI đang chấm");
      if (c.ai_screening_status === "failed") return make("hr", "blocked", "Cần xử lý chấm AI");
      return make("hr", "ready", "Sẵn sàng phỏng vấn");
    }
    case "evaluating": {
      if (related.testAwaitingGrade) return make("hr", "waiting", "Chờ chấm test");
      if (related.testAwaitingSubmission) return make("candidate", "waiting", "Chờ làm test");
      if (related.nextInterviewAt && Date.parse(related.nextInterviewAt) > now)
        return make(
          "candidate",
          "waiting",
          "Chờ phỏng vấn",
          related.lastStageChangeAt ?? baseAnchor,
        );
      if (related.awaitingEvaluation) return make("manager", "waiting", "Chờ đánh giá phỏng vấn");
      return make("hr", "ready", "Sẵn sàng đề xuất");
    }
    case "approving": {
      const step = related.pendingApprovalStep;
      if (step) {
        const w = STEP_WAITING[step];
        return make(w.waitingOn, "waiting", w.label);
      }
      // No pending step but still in `approving` = a data inconsistency HR should see.
      return make("hr", "blocked", "Chưa có bước duyệt");
    }
    case "offer": {
      const hasLiveToken =
        !!c.offer_token &&
        (!c.offer_token_expires_at || Date.parse(c.offer_token_expires_at) > now);
      if (!c.offer_response && hasLiveToken)
        return make("candidate", "waiting", "Chờ ứng viên phản hồi offer");
      if (!c.offer_response && c.offer_token && !hasLiveToken)
        return make("hr", "blocked", "Offer hết hạn");
      return make("hr", "ready", "Duyệt xong — soạn offer");
    }
    case "offer_accepted":
      return make("hr", "ready", "Chờ HR xác nhận tuyển");
    case "hired":
      return make(null, "done", "Đã tuyển");
    case "rejected":
      return make(null, "done", REJECTION_LABEL[c.rejection_reason ?? "other"] ?? "Từ chối");
    case "withdrew":
      return make(null, "done", "Rút hồ sơ");
    default:
      return make(null, "waiting", "—");
  }
}
