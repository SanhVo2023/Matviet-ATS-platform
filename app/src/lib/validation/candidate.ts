/**
 * Zod schemas for candidate upload + edit forms, plus the kanban stage-group
 * mapping. The stage ENUM + transition guard live in `@/lib/stages` (single
 * source of truth, renovation R1); this module re-exports them so existing
 * importers keep compiling, and owns only the board-grouping presentation.
 */
import { z } from "zod";
import { allowedNextStages as _allowedNextStages, type Stage } from "@/lib/stages";

export {
  PIPELINE_STAGES as ALL_STAGES,
  allowedNextStages,
  isValidTransition,
  type Stage,
} from "@/lib/stages";

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

// ---------------------------------------------------------------------------
// Kanban stage-groups. With the 16→8 collapse (renovation R1) the groups are
// now near 1:1 with stages; the board still shows 4 business columns + a
// toggleable "Đã đóng". `canonical` = the stage a drop onto the column moves
// the card to (null = the Offer column, which starts the approval chain).
// ---------------------------------------------------------------------------

export interface StageGroup {
  id: string;
  /** Emoji column marker (R4 will convert to lucide app-wide). */
  icon: string;
  label: string;
  description: string;
  stages: readonly Stage[];
  canonical: Stage | null;
}

export const STAGE_GROUPS: readonly StageGroup[] = [
  {
    id: "g_intake",
    icon: "📥",
    label: "Tiếp nhận & Sàng lọc",
    description: "Hồ sơ mới từ các kênh, chờ AI chấm và lọc sơ bộ.",
    stages: ["intake"],
    canonical: "intake",
  },
  {
    id: "g_eval",
    icon: "🗣️",
    label: "Đánh giá & Phỏng vấn",
    description: "Ứng viên đang làm test, phỏng vấn HR hoặc Trưởng bộ phận.",
    stages: ["evaluating"],
    canonical: "evaluating",
  },
  {
    id: "g_offer",
    icon: "🤝",
    label: "Đề nghị làm việc",
    description: "Đạt yêu cầu — đang duyệt đề xuất và gửi offer.",
    stages: ["approving", "offer"],
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

/** Rejected/withdrew — hidden behind a toggle chip; NOT a drop target. */
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

/**
 * Which stage a drop onto `group` maps to for a card currently in `current`,
 * or null when the move isn't allowed. `g_offer` returns "approving" (the
 * board special-cases it to start the approval chain).
 */
export function resolveGroupTarget(current: Stage, group: StageGroup): Stage | null {
  const target = group.canonical ?? (group.id === "g_offer" ? "approving" : null);
  if (!target) return null;
  return _allowedNextStages(current).includes(target) ? target : null;
}
