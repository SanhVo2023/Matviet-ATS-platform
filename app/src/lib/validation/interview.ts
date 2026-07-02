/**
 * Zod schemas for interview scheduling + review form.
 * Six review-form criteria mirror docs/PRD §FR-08 / interview_evaluations.scores jsonb shape.
 */
import { z } from "zod";

export const INTERVIEW_TYPES = ["in_person", "phone", "video"] as const;
export const RECOMMENDATIONS = ["strong_yes", "yes", "maybe", "no"] as const;

export const REVIEW_CRITERIA = [
  "technical",
  "soft",
  "experience",
  "culture",
  "potential",
  "attitude",
] as const;
export type ReviewCriterion = (typeof REVIEW_CRITERIA)[number];

const FUTURE_OR_NOW = z
  .string()
  .datetime({ message: "Thời gian không hợp lệ" })
  .refine((v) => new Date(v).getTime() > Date.now() - 60_000, {
    message: "Thời gian phỏng vấn phải ở tương lai",
  });

export const ScheduleInterviewSchema = z.object({
  candidate_id: z.string().uuid(),
  scheduled_at: FUTURE_OR_NOW, // ISO string
  duration_min: z.coerce.number().int().min(15).max(240),
  type: z.enum(INTERVIEW_TYPES),
  location_or_link: z.string().trim().max(500).optional().or(z.literal("")),
  /** profiles.id list. At least one. Max 10 per LIMITS.interviewAttendeesMax. */
  attendee_ids: z.array(z.string().uuid()).min(1, "Phải có ít nhất 1 người PV").max(10),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type ScheduleInterviewInput = z.infer<typeof ScheduleInterviewSchema>;

export const RescheduleInterviewSchema = z.object({
  interview_id: z.string().uuid(),
  scheduled_at: FUTURE_OR_NOW,
  duration_min: z.coerce.number().int().min(15).max(240).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

const ScoreField = z.coerce.number().int().min(0).max(100);

export const SubmitEvaluationSchema = z.object({
  interview_id: z.string().uuid(),
  scores: z.object({
    technical: ScoreField,
    soft: ScoreField,
    experience: ScoreField,
    culture: ScoreField,
    potential: ScoreField,
    attitude: ScoreField,
  }),
  strengths: z.string().trim().max(2000).optional().or(z.literal("")),
  concerns: z.string().trim().max(2000).optional().or(z.literal("")),
  proposed_salary: z.coerce.number().int().nonnegative().nullable().optional(),
  recommendation: z.enum(RECOMMENDATIONS),
  internal_notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type SubmitEvaluationInput = z.infer<typeof SubmitEvaluationSchema>;
