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
    .enum(["manual_upload", "email_inbox", "csv_import", "topcv_api", "referral"])
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
