/**
 * Zod schemas + constants for the assessments (bài test) flow.
 *
 * Lifecycle:
 *   - HR uploads a test PDF for a job (per-job, replaces existing).
 *   - HR clicks "Send" on a candidate → service generates a 48h token,
 *     queues an email_messages row, optionally returns a signed link for
 *     manual paste while G6 IT bundle is still pending.
 *   - Candidate opens /test/[token] → uploads answer PDF → recordSubmission.
 *   - HR opens the submission, enters score → gradeSubmission, stage advances
 *     to 'test_done'.
 */

import { z } from "zod";

export const ASSESSMENT_FILE_MAX_BYTES = 20 * 1024 * 1024; // 20 MB — tests can be larger than CVs
export const ASSESSMENT_ACCEPTED_MIMES = ["application/pdf"] as const;

export type AssessmentMime = (typeof ASSESSMENT_ACCEPTED_MIMES)[number];
export function isAcceptedAssessmentMime(mime: string): mime is AssessmentMime {
  return (ASSESSMENT_ACCEPTED_MIMES as readonly string[]).includes(mime);
}

export const CreateAssessmentSchema = z.object({
  job_id: z.string().uuid("Vị trí không hợp lệ"),
  instructions: z.string().trim().max(2000, "Hướng dẫn quá dài").optional().or(z.literal("")),
  time_limit_min: z.number().int().positive().max(480, "Tối đa 8 tiếng").optional().nullable(),
});
export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;

export const SendAssessmentSchema = z.object({
  candidate_id: z.string().uuid("Ứng viên không hợp lệ"),
  assessment_id: z.string().uuid("Bài test không hợp lệ"),
});
export type SendAssessmentInput = z.infer<typeof SendAssessmentSchema>;

export const GradeSubmissionSchema = z.object({
  submission_id: z.string().uuid(),
  score: z.number().min(0, "Điểm tối thiểu 0").max(100, "Điểm tối đa 100"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type GradeSubmissionInput = z.infer<typeof GradeSubmissionSchema>;

/** 48 hours — token expiry for the candidate-facing submission page. */
export const ASSESSMENT_TOKEN_EXPIRY_MS = 48 * 60 * 60 * 1000;
