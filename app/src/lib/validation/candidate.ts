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
// Super-stage groups (ADR 0015): the kanban BOARD shows 7 columns; the DB
// keeps all 16 detailed stages (history, reports, agent untouched). Cards
// display their detailed stage as a badge; the table StageDropdown still
// reaches every sub-stage.
// ---------------------------------------------------------------------------

export interface StageGroup {
  id: string;
  label: string;
  stages: readonly Stage[];
  /** Stage a drop maps to; null = special handling (Phê duyệt starts a chain). */
  canonical: Stage | null;
}

export const STAGE_GROUPS: readonly StageGroup[] = [
  { id: "g_new", label: "Mới", stages: ["new"], canonical: "new" },
  { id: "g_screen", label: "Sàng lọc", stages: ["screening", "screened"], canonical: "screened" },
  {
    id: "g_interview",
    label: "Phỏng vấn & Test",
    stages: ["interview_scheduled", "interviewed", "test_sent", "test_done"],
    canonical: "interview_scheduled",
  },
  {
    id: "g_approval",
    label: "Phê duyệt",
    stages: ["recommended", "salary_deal", "bod_review", "tap_doan_review"],
    canonical: null,
  },
  {
    id: "g_offer",
    label: "Offer",
    stages: ["offer_sent", "offer_accepted"],
    canonical: "offer_sent",
  },
  { id: "g_hired", label: "Đã tuyển", stages: ["hired"], canonical: "hired" },
  { id: "g_closed", label: "Đóng", stages: ["rejected", "withdrew"], canonical: "rejected" },
] as const;

export function groupOfStage(s: Stage): StageGroup {
  return STAGE_GROUPS.find((g) => g.stages.includes(s)) ?? STAGE_GROUPS[0]!;
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
