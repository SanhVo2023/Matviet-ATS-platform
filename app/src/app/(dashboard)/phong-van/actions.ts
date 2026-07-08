"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  ScheduleInterviewSchema,
  SubmitEvaluationSchema,
  type ScheduleInterviewInput,
  type SubmitEvaluationInput,
} from "@/lib/validation/interview";
import { scheduleInterview, cancelInterview, submitEvaluation } from "@/server/interviews/service";
import { startApproval } from "@/server/approvals/engine";
import { generateAndPersistInterviewQuestions } from "@/server/interviews/ai-questions";
import "@/server/ai/runtime";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export async function scheduleInterviewAction(
  input: ScheduleInterviewInput,
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["admin", "hr"]);
  const parsed = ScheduleInterviewSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  try {
    const { id } = await scheduleInterview(parsed.data, profile.id);

    // Ambient AI (ADR 0018): draft interview questions in the background so
    // they're already on the interview page when someone opens it. Best-effort
    // — waitUntil may be cut off (~30s cap); the page keeps a "Tạo câu hỏi"
    // fallback for that case.
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const { ctx } = await getCloudflareContext({ async: true });
      ctx.waitUntil(
        generateAndPersistInterviewQuestions(id).catch((err) =>
          console.warn("[interview] auto question generation failed:", err),
        ),
      );
    } catch (bgErr) {
      console.warn("[interview] could not schedule question generation:", bgErr);
    }

    revalidatePath("/phong-van");
    revalidatePath(`/ung-vien/${parsed.data.candidate_id}`);
    revalidatePath(`/vi-tri/${id}`);
    return { ok: true, data: { id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi đặt lịch" };
  }
}

export async function cancelInterviewAction(
  interviewId: string,
  candidateId?: string,
  reason?: string,
): Promise<ActionResult> {
  await requireRole(["admin", "hr"]);
  try {
    await cancelInterview(interviewId, reason);
    revalidatePath("/phong-van");
    revalidatePath(`/phong-van/${interviewId}`);
    if (candidateId) revalidatePath(`/ung-vien/${candidateId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi hủy lịch" };
  }
}

export async function submitEvaluationAction(
  input: SubmitEvaluationInput,
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["admin", "hr", "hiring_manager"]);
  const parsed = SubmitEvaluationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  try {
    const { id } = await submitEvaluation(parsed.data, profile.id);
    revalidatePath(`/phong-van/${parsed.data.interview_id}`);
    revalidatePath("/phong-van");
    return { ok: true, data: { id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi lưu đánh giá" };
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Tạo lại" for the AI interview questions (ADR 0018). Generation itself is
 * ambient — scheduleInterviewAction fires it automatically — so this action
 * is the regenerate/backfill path. The shared core persists the result on
 * the interview row.
 */
export async function generateInterviewQuestionsAction(
  interviewId: string,
): Promise<ActionResult<{ questions: string[] }>> {
  await requireRole(["admin", "hr", "hiring_manager"]);
  if (!UUID_RE.test(interviewId)) return { ok: false, error: "ID không hợp lệ" };

  try {
    const questions = await generateAndPersistInterviewQuestions(interviewId);
    revalidatePath(`/phong-van/${interviewId}`);
    return { ok: true, data: { questions } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không tạo được câu hỏi" };
  }
}

/**
 * "Đề xuất lên trên" — kicks off the approval flow for a candidate.
 * Lives in interviews actions because the natural trigger point in the UI is
 * after an interview review is filed.
 */
export async function startApprovalAction(
  candidateId: string,
): Promise<ActionResult<{ already_started: boolean }>> {
  await requireRole(["admin", "hr", "hiring_manager"]);
  try {
    const r = await startApproval(candidateId);
    revalidatePath(`/ung-vien/${candidateId}`);
    revalidatePath("/phe-duyet");
    return { ok: true, data: { already_started: r.already_started } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tạo quy trình duyệt" };
  }
}
