/**
 * Zod schemas for job CRUD forms.
 *
 * Two layers:
 *   - `JobInputSchema` for the form (allows draft submissions with empty title etc.).
 *   - `JobPublishSchema` re-validates with stricter rules right before status flips
 *     to "open" — title required, weights present, hiring manager assigned.
 */
import { z } from "zod";
import { SCORING_CRITERION_CODES, type CriterionCode } from "@/lib/constants";

// Match Postgres enums verbatim (see app/supabase/migrations/0001_extensions_and_enums.sql).
export const ROLE_FAMILIES = ["sales", "optician", "office", "manager", "custom"] as const;
export const FLOW_TYPES = ["staff", "management"] as const;
export const JOB_STATUSES = ["draft", "open", "paused", "closed", "filled"] as const;

const WEIGHTS_TOLERANCE = 0.001;

const WeightsSchema = z
  .object({
    industry_fit: z.number().min(0).max(1),
    professional_skills: z.number().min(0).max(1),
    work_experience: z.number().min(0).max(1),
    years_experience: z.number().min(0).max(1),
    education: z.number().min(0).max(1),
    location: z.number().min(0).max(1),
  })
  .refine(
    (w) => {
      const sum = SCORING_CRITERION_CODES.reduce((acc, k: CriterionCode) => acc + (w[k] ?? 0), 0);
      return Math.abs(sum - 1) <= WEIGHTS_TOLERANCE;
    },
    { message: "Tổng trọng số phải bằng 100%" },
  );

export type Weights = z.infer<typeof WeightsSchema>;

/**
 * Form schema — accepts drafts with most fields blank.
 * Title must be present so the row has a recognizable name in the list.
 */
export const JobInputSchema = z.object({
  title: z.string().trim().min(2, "Tiêu đề quá ngắn").max(200, "Tiêu đề quá dài"),
  department_id: z.string().uuid().nullable().optional(),
  role_family: z.enum(ROLE_FAMILIES),
  flow_type: z.enum(FLOW_TYPES),
  description: z.string().max(50_000).default(""),
  requirements_html: z.string().max(50_000).default(""),
  location: z.string().max(200).nullable().optional(),
  salary_min: z.coerce.number().int().nonnegative().nullable().optional(),
  salary_max: z.coerce.number().int().nonnegative().nullable().optional(),
  headcount: z.coerce.number().int().min(1, "Số lượng tối thiểu là 1").max(100).default(1),
  weights: WeightsSchema,
  hiring_manager_ids: z.array(z.string().uuid()).default([]),
});

export type JobInput = z.infer<typeof JobInputSchema>;

/**
 * Stricter check before moving from draft → open:
 * non-empty description + coherent salary range (when both bounds set).
 */
// ADR 0015: department + hiring manager are no longer publish blockers —
// notification fan-out falls back to hr+admin when no manager is assigned
// (see jobManagerIds), and most stores hire without a department entry.
export const JobPublishSchema = JobInputSchema.refine((j) => j.description.trim().length > 0, {
  message: "Mô tả công việc không được để trống",
  path: ["description"],
}).refine(
  (j) => {
    if (j.salary_min == null || j.salary_max == null) return true;
    return j.salary_max >= j.salary_min;
  },
  { message: "Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu", path: ["salary_max"] },
);
