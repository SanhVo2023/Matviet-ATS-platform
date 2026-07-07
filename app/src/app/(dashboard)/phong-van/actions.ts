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
import { getInterview } from "@/server/interviews/repository";
import { getCandidate } from "@/server/candidates/repository";
import { getJob } from "@/server/jobs/repository";
import { aiChat } from "@/lib/ai/workers-ai";
import "@/server/ai/runtime";
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

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * AI-suggest 6-8 Vietnamese interview questions grounded in the candidate's
 * real CV + AI screening breakdown and the job requirements. Read-only —
 * nothing is persisted; the interviewer copies what they like.
 */
export async function generateInterviewQuestionsAction(
  interviewId: string,
): Promise<ActionResult<{ questions: string[] }>> {
  await requireRole(["admin", "hr", "hiring_manager"]);
  if (!UUID_RE.test(interviewId)) return { ok: false, error: "ID không hợp lệ" };

  const interview = await getInterview(interviewId);
  if (!interview) return { ok: false, error: "Không tìm thấy buổi phỏng vấn" };
  const [candidate, job] = await Promise.all([
    getCandidate(interview.candidate_id),
    getJob(interview.job_id),
  ]);
  if (!candidate) return { ok: false, error: "Không tìm thấy ứng viên" };

  // Dossier view (ADR 0017): CV markdown + notes + PREVIOUS interview
  // evaluations — round-2 questions can build on round-1 findings.
  const { buildCandidateDossier } = await import("@/server/candidates/dossier");
  const dossier = ((await buildCandidateDossier(candidate.id, { maxCvChars: 6000 })) ?? "").slice(
    0,
    14_000,
  );
  const breakdown = candidate.ai_breakdown
    ? JSON.stringify(candidate.ai_breakdown).slice(0, 2500)
    : "";
  const requirementsHtml =
    job?.requirements && typeof job.requirements === "object" && "html" in job.requirements
      ? String((job.requirements as { html?: unknown }).html ?? "")
      : "";

  try {
    const { text } = await aiChat(
      [
        {
          role: "system",
          content:
            "Bạn là chuyên gia tuyển dụng của Mắt Việt (chuỗi cửa hàng mắt kính Việt Nam). " +
            "Soạn 6-8 câu hỏi phỏng vấn tiếng Việt dựa trên CV THẬT của ứng viên và yêu cầu vị trí: " +
            "vừa xác minh các điểm mạnh ứng viên nêu trong CV, vừa đào sâu các khoảng trống/rủi ro (nhất là các tiêu chí AI chấm thấp). " +
            "Câu hỏi cụ thể, mở, bám vào chi tiết trong CV — không hỏi chung chung. " +
            "Trả về DUY NHẤT danh sách đánh số dạng '1. ...' mỗi câu một dòng, không tiêu đề, không giải thích.",
        },
        {
          role: "user",
          content:
            `Vị trí: ${job?.title ?? "—"}.\n` +
            (requirementsHtml
              ? `Yêu cầu vị trí: ${stripHtml(requirementsHtml).slice(0, 1500)}\n`
              : "") +
            (dossier
              ? `Hồ sơ đầy đủ của ứng viên (Markdown):\n${dossier}\n`
              : `Ứng viên: ${candidate.full_name}. CV chưa có nội dung trích xuất.\n`) +
            (breakdown ? `Kết quả chấm điểm AI theo tiêu chí (JSON):\n${breakdown}` : ""),
        },
      ],
      { maxTokens: 3072, temperature: 0.5, feature: "interview_questions" },
    );

    const questions = text
      .split("\n")
      .map((line) => line.match(/^\s*\d+[.)]\s*(.+)$/)?.[1]?.trim())
      .filter((q): q is string => !!q && q.length > 5)
      .slice(0, 8);
    if (questions.length < 3) {
      return { ok: false, error: "AI trả về sai định dạng — vui lòng thử lại." };
    }
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
