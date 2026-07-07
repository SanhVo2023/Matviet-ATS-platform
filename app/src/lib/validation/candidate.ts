/**
 * Zod schemas for candidate upload + edit forms.
 */
import { z } from "zod";

// E.164 or Vietnamese local mobile patterns: tolerant — we just normalize.
const PHONE_RE = /^[+\d][\d\s\-().]{6,20}$/;

export const CandidateUploadSchema = z.object({
  full_name: z.string().trim().min(2, "Họ tên quá ngắn").max(120, "Họ tên quá dài"),
  email: z.string().trim().email("Email không hợp lệ").max(200).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(PHONE_RE, "Số điện thoại không hợp lệ")
    .max(30)
    .optional()
    .or(z.literal("")),
  job_id: z.string().uuid("Vị trí ứng tuyển không hợp lệ"),
  source: z
    .enum(["manual_upload", "email_inbox", "csv_import", "topcv_api", "referral", "careers_page"])
    .default("manual_upload"),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type CandidateUploadInput = z.infer<typeof CandidateUploadSchema>;

/**
 * Pipeline stage transitions allowed from the UI dropdown.
 * Most transitions are open, but we lock down a few obvious mistakes:
 *   - Once `hired`, only `withdrew` (rare reversal) is offered
 *   - Once `rejected` or `withdrew`, no further transitions (HR clones to a new candidate row instead)
 */
export const ALL_STAGES = [
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
] as const;

export type Stage = (typeof ALL_STAGES)[number];

const TERMINAL = new Set<Stage>(["rejected", "withdrew"]);
const HIRED_NEXT = new Set<Stage>(["withdrew"]);

export function allowedNextStages(current: Stage): Stage[] {
  if (TERMINAL.has(current)) return [];
  if (current === "hired") return [...HIRED_NEXT];
  return ALL_STAGES.filter((s) => s !== current);
}

// ---------------------------------------------------------------------------
// Super-stage groups (ADR 0015, tightened to 4 BUSINESS columns — Sanh
// 2026-07-07): the kanban BOARD shows 4 columns + a toggleable "Đã đóng";
// the DB keeps all 16 detailed stages (history, reports, agent untouched).
// Cards show a READINESS dot+label (see stageReadiness); the table
// StageDropdown still reaches every sub-stage.
// ---------------------------------------------------------------------------

export interface StageGroup {
  id: string;
  /** Emoji column marker (business language, per Sanh's spec). */
  icon: string;
  label: string;
  /** One-line business description shown under the column header. */
  description: string;
  stages: readonly Stage[];
  /** Stage a drop maps to; null = special handling (Offer column starts the approval chain). */
  canonical: Stage | null;
}

export const STAGE_GROUPS: readonly StageGroup[] = [
  {
    id: "g_intake",
    icon: "📥",
    label: "Tiếp nhận & Sàng lọc",
    description: "Hồ sơ mới từ các kênh, chờ AI chấm và lọc sơ bộ.",
    stages: ["new", "screening", "screened"],
    canonical: "screened",
  },
  {
    id: "g_eval",
    icon: "🗣️",
    label: "Đánh giá & Phỏng vấn",
    description: "Ứng viên đang làm test, phỏng vấn HR hoặc Trưởng bộ phận.",
    stages: ["interview_scheduled", "interviewed", "test_sent", "test_done"],
    canonical: "interview_scheduled",
  },
  {
    id: "g_offer",
    icon: "🤝",
    label: "Đề nghị làm việc",
    description: "Đạt yêu cầu — đang duyệt đề xuất, tham chiếu và đàm phán lương.",
    stages: ["recommended", "salary_deal", "bod_review", "tap_doan_review", "offer_sent"],
    canonical: null,
  },
  {
    id: "g_onboard",
    icon: "🎉",
    label: "Chấp nhận & Onboarding",
    description: "Đã đồng ý offer, chuẩn bị cho ngày làm việc đầu tiên.",
    stages: ["offer_accepted", "hired"],
    canonical: "offer_accepted",
  },
] as const;

/** Rejected/withdrew — hidden behind a toggle chip; NOT a drop target
 * (rejecting is a consequential action, done from the detail page/table). */
export const CLOSED_GROUP: StageGroup = {
  id: "g_closed",
  icon: "🗂️",
  label: "Đã đóng",
  description: "Từ chối hoặc rút lui — giữ lại để tra cứu.",
  stages: ["rejected", "withdrew"],
  canonical: null,
};

export function groupOfStage(s: Stage): StageGroup {
  if (CLOSED_GROUP.stages.includes(s)) return CLOSED_GROUP;
  return STAGE_GROUPS.find((g) => g.stages.includes(s)) ?? STAGE_GROUPS[0]!;
}

// ---------------------------------------------------------------------------
// Readiness — the card's status COLOR (Sanh 2026-07-07): green = gate passed,
// ready for the next column; gray = waiting on someone; red = HR must act.
// Always paired with a text label (never color alone — color-blind safe).
// Derived purely from current_stage + ai_screening_status; the approval
// engine sets offer_sent the moment the chain fully approves, so that stage
// reads "approved — compose/await the offer".
// ---------------------------------------------------------------------------

export type ReadinessTone = "ready" | "waiting" | "blocked" | "done";

export interface Readiness {
  tone: ReadinessTone;
  label: string;
}

const STAGE_READINESS: Record<Stage, Readiness> = {
  new: { tone: "waiting", label: "Chờ xử lý" },
  screening: { tone: "waiting", label: "AI đang chấm" },
  screened: { tone: "ready", label: "Sẵn sàng phỏng vấn" },
  interview_scheduled: { tone: "waiting", label: "Chờ phỏng vấn" },
  interviewed: { tone: "ready", label: "Sẵn sàng đề xuất" },
  test_sent: { tone: "waiting", label: "Chờ làm test" },
  test_done: { tone: "ready", label: "Sẵn sàng đề xuất" },
  recommended: { tone: "waiting", label: "Đang chờ duyệt" },
  salary_deal: { tone: "waiting", label: "Đang chờ duyệt" },
  bod_review: { tone: "waiting", label: "BOD đang duyệt" },
  tap_doan_review: { tone: "waiting", label: "Tập đoàn đang duyệt" },
  offer_sent: { tone: "ready", label: "Duyệt xong — offer" },
  offer_accepted: { tone: "ready", label: "Chốt nhận việc" },
  hired: { tone: "done", label: "Đã tuyển" },
  rejected: { tone: "blocked", label: "Từ chối" },
  withdrew: { tone: "waiting", label: "Rút lui" },
};

export function stageReadiness(stage: Stage, aiStatus?: string | null): Readiness {
  // A broken AI screening needs a human BEFORE the pipeline can move —
  // only relevant while the candidate is still in intake.
  if (
    (aiStatus === "failed" || aiStatus === "needs_review") &&
    groupOfStage(stage).id === "g_intake"
  ) {
    return { tone: "blocked", label: "Cần xử lý chấm AI" };
  }
  return STAGE_READINESS[stage];
}

/**
 * Which detailed stage a drop onto `group` maps to for a card currently in
 * `current`. Falls back to the first *allowed* stage in the group so e.g.
 * hired → Đóng lands on `withdrew` (rejected isn't reachable from hired).
 * Null = the move is not allowed at all.
 */
export function resolveGroupTarget(current: Stage, group: StageGroup): Stage | null {
  const allowed = allowedNextStages(current);
  if (group.canonical && allowed.includes(group.canonical)) return group.canonical;
  return group.stages.find((s) => allowed.includes(s)) ?? null;
}
