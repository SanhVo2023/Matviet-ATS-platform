"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { enqueueScoring, recordManualScore, jobWeights } from "@/server/scoring/repository";
import { triggerEdgeFunction } from "@/server/scoring/orchestration";
import { getCandidate } from "@/server/candidates/repository";
import { getJob } from "@/server/jobs/repository";
import { CRITERION_CODES, type CriterionCode } from "@/lib/ai/gemini/types";
import {
  ASSESSMENT_FILE_MAX_BYTES,
  GradeSubmissionSchema,
  SendAssessmentSchema,
  isAcceptedAssessmentMime,
} from "@/lib/validation/assessment";
import {
  gradeSubmission,
  sendAssessment,
  uploadAnswerOnBehalf,
} from "@/server/assessments/service";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Re-enqueue scoring for a candidate. Used by both:
 *   - "Thử lại" button on a failed screening
 *   - "Chấm lại" button on a successful screening (HR wants a fresh AI pass)
 */
export async function triggerScoringAction(candidateId: string): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  if (!isUuid(candidateId)) return { ok: false, error: "ID không hợp lệ" };
  try {
    await enqueueScoring(candidateId, profile.id);
    triggerEdgeFunction(candidateId);
    revalidatePath(`/ung-vien/${candidateId}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không kích hoạt được chấm điểm",
    };
  }
}

const ManualScoreSchema = z.object({
  candidate_id: z.string().uuid(),
  scores: z.object(
    Object.fromEntries(CRITERION_CODES.map((k) => [k, z.number().int().min(0).max(100)])) as Record<
      CriterionCode,
      z.ZodNumber
    >,
  ),
  reasoning: z.string().trim().max(500).optional(),
});

export async function manualScoreAction(input: unknown): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  const parsed = ManualScoreSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const candidate = await getCandidate(parsed.data.candidate_id);
  if (!candidate) return { ok: false, error: "Không tìm thấy ứng viên" };
  const job = await getJob(candidate.job_id);
  if (!job) return { ok: false, error: "Không tìm thấy tin tuyển dụng" };

  try {
    await recordManualScore({
      candidateId: parsed.data.candidate_id,
      scores: parsed.data.scores as Record<CriterionCode, number>,
      weights: jobWeights(job.weights),
      actorId: profile.id,
      reasoning: parsed.data.reasoning,
    });
    revalidatePath(`/ung-vien/${parsed.data.candidate_id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không lưu được điểm" };
  }
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// ──────────────────────── Assessments (Group 9) ────────────────────────

/**
 * Send a test invitation for a candidate. Returns the signed link so HR can
 * paste it into Outlook manually while G6 (email send) is IT-blocked.
 */
export async function sendAssessmentAction(
  input: unknown,
): Promise<ActionResult<{ token: string; signed_link: string; deadline_at: string }>> {
  const profile = await requireRole(["admin", "hr"]);
  const parsed = SendAssessmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  try {
    const result = await sendAssessment(
      parsed.data.candidate_id,
      parsed.data.assessment_id,
      profile.id,
    );
    revalidatePath(`/ung-vien/${parsed.data.candidate_id}`);
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không gửi được bài test" };
  }
}

export async function gradeSubmissionAction(input: unknown): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  const parsed = GradeSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  try {
    await gradeSubmission(parsed.data, profile.id);
    revalidatePath(`/ung-vien`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không lưu được điểm" };
  }
}

/**
 * HR uploads the candidate's answer file on their behalf (when the candidate
 * emailed the answer instead of using the public form).
 */
export async function uploadAnswerOnBehalfAction(formData: FormData): Promise<ActionResult> {
  await requireRole(["admin", "hr"]);
  const submissionId = String(formData.get("submission_id") ?? "");
  if (!isUuid(submissionId)) return { ok: false, error: "ID phiếu nộp không hợp lệ" };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Vui lòng chọn file bài làm." };
  if (!isAcceptedAssessmentMime(file.type)) {
    return { ok: false, error: "Loại file không hỗ trợ. Chỉ chấp nhận PDF." };
  }
  if (file.size <= 0) return { ok: false, error: "File trống." };
  if (file.size > ASSESSMENT_FILE_MAX_BYTES) {
    return { ok: false, error: "File quá lớn. Tối đa 20 MB." };
  }
  try {
    const buffer = await file.arrayBuffer();
    await uploadAnswerOnBehalf(submissionId, {
      buffer,
      mime: file.type,
      originalName: file.name,
      size: file.size,
    });
    revalidatePath(`/ung-vien`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tải lên" };
  }
}
