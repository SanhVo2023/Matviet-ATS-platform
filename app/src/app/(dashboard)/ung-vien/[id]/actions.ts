"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { enqueueScoring, recordManualScore, jobWeights } from "@/server/scoring/repository";
import { triggerEdgeFunction } from "@/server/scoring/orchestration";
import { getCandidate } from "@/server/candidates/repository";
import { getJob } from "@/server/jobs/repository";
import { aiChat } from "@/lib/ai/workers-ai";
import "@/server/ai/runtime";
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
 * Replace a candidate's CV (re-upload). Stores the new file in R2, points the
 * candidate at it, wipes the previous AI analysis, and re-enqueues scoring.
 * The old file/cv_files row stay for audit (ai_screenings reference history).
 */
export async function changeCandidateCvAction(
  candidateId: string,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  if (!isUuid(candidateId)) return { ok: false, error: "ID không hợp lệ" };

  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Chưa chọn file CV" };
  }
  const { CV_ACCEPTED_MIMES, CV_MAX_BYTES, cvStoragePath } = await import("@/lib/storage/paths");
  if (!(CV_ACCEPTED_MIMES as readonly string[]).includes(file.type)) {
    return { ok: false, error: "Chỉ nhận PDF hoặc DOCX" };
  }
  if (file.size > CV_MAX_BYTES) {
    return { ok: false, error: "File vượt quá 10 MB" };
  }

  try {
    const candidate = await getCandidate(candidateId);
    if (!candidate) return { ok: false, error: "Không tìm thấy ứng viên" };

    const { putFile } = await import("@/lib/r2");
    const { getDb } = await import("@/db");
    const { cv_files, candidates } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    // Version the key with a timestamp so the old object is never overwritten
    const storagePath = cvStoragePath(candidateId, `${Date.now()}-${file.name}`);
    await putFile(storagePath, new Uint8Array(await file.arrayBuffer()), file.type);

    const db = await getDb();
    const inserted = await db
      .insert(cv_files)
      .values({
        storage_path: storagePath,
        original_name: file.name,
        mime: file.type,
        size_bytes: file.size,
        uploaded_by: profile.id,
      })
      .returning({ id: cv_files.id });

    await db
      .update(candidates)
      .set({
        cv_file_id: inserted[0]!.id,
        ai_score: null,
        ai_breakdown: null,
        ai_scored_at: null,
        ai_screening_status: "pending",
        ai_screening_error: null,
        cv_text: null,
        parsed: null,
      })
      .where(eq(candidates.id, candidateId));

    // Discard the old CV's markdown cache (ADR 0017) — the new file gets its
    // own conversion when scoring runs.
    try {
      const { cv_markdowns } = await import("@/db/schema");
      await db.delete(cv_markdowns).where(eq(cv_markdowns.candidate_id, candidateId));
    } catch (cacheErr) {
      console.warn("[change-cv] cache discard failed:", cacheErr);
    }

    await enqueueScoring(candidateId, profile.id);
    triggerEdgeFunction(candidateId);
    revalidatePath(`/ung-vien/${candidateId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không đổi được CV" };
  }
}

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
  if (!job) return { ok: false, error: "Không tìm thấy vị trí" };

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

/**
 * AI summary of a candidate (3-4 Vietnamese sentences: highlights, risks,
 * suggested next step). Ambient AI (ADR 0018): the scoring worker seeds
 * candidates.ai_summary automatically; this action is the "Tóm tắt lại"
 * refresh — it re-reads the WHOLE dossier (notes, interviews, approvals)
 * and persists the richer result.
 */
export async function summarizeCandidateAction(
  candidateId: string,
): Promise<ActionResult<{ summary: string }>> {
  await requireRole(["admin", "hr", "hiring_manager"]);
  if (!isUuid(candidateId)) return { ok: false, error: "ID không hợp lệ" };

  const candidate = await getCandidate(candidateId);
  if (!candidate) return { ok: false, error: "Không tìm thấy ứng viên" };
  const job = await getJob(candidate.job_id);

  // Dossier view (ADR 0017): CV markdown + notes + interview evals + approvals
  // — the AI reads the WHOLE journey, not just the CV.
  const { buildCandidateDossier } = await import("@/server/candidates/dossier");
  const dossier = ((await buildCandidateDossier(candidateId, { maxCvChars: 6000 })) ?? "").slice(
    0,
    14_000,
  );
  const breakdown = candidate.ai_breakdown
    ? JSON.stringify(candidate.ai_breakdown).slice(0, 2500)
    : "";

  try {
    const { text } = await aiChat(
      [
        {
          role: "system",
          content:
            "Bạn là chuyên viên tuyển dụng của Mắt Việt (chuỗi cửa hàng mắt kính Việt Nam). " +
            "Tóm tắt hồ sơ ứng viên trong 3-4 câu tiếng Việt: (1) điểm nổi bật phù hợp vị trí, " +
            "(2) rủi ro hoặc điểm cần lưu ý, (3) đề xuất bước tiếp theo phù hợp với giai đoạn hiện tại. " +
            "Chỉ dựa trên dữ liệu được cung cấp, không bịa. Trả về văn bản thuần, không markdown, không tiêu đề.",
        },
        {
          role: "user",
          content:
            (dossier
              ? `Hồ sơ đầy đủ (Markdown):\n${dossier}\n`
              : `Ứng viên: ${candidate.full_name}. Vị trí: ${job?.title ?? "—"}. Chưa có dữ liệu hồ sơ.\n`) +
            (breakdown ? `\nChi tiết chấm điểm AI theo tiêu chí (JSON):\n${breakdown}` : ""),
        },
      ],
      { maxTokens: 2048, temperature: 0.4, feature: "candidate_summary" },
    );
    const summary = text.trim();
    if (!summary) return { ok: false, error: "AI trả về rỗng — vui lòng thử lại." };

    // Persist (ADR 0018) so the next visitor sees it without clicking.
    try {
      const { getDb } = await import("@/db");
      const { candidates } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      await db
        .update(candidates)
        .set({ ai_summary: summary.slice(0, 4000), ai_summary_at: new Date().toISOString() })
        .where(eq(candidates.id, candidateId));
      revalidatePath(`/ung-vien/${candidateId}`);
    } catch (persistErr) {
      console.warn("[summary] persist failed (returning ephemeral result):", persistErr);
    }
    return { ok: true, data: { summary } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không tóm tắt được hồ sơ" };
  }
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
