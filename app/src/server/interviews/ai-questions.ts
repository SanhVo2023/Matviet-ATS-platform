import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { interviews } from "@/db/schema";
import { aiChat } from "@/lib/ai/workers-ai";
import "@/server/ai/runtime";
import { getInterview } from "@/server/interviews/repository";
import { getCandidate } from "@/server/candidates/repository";
import { getJob } from "@/server/jobs/repository";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ambient AI (ADR 0018): generate 6-8 grounded Vietnamese interview questions
 * for an interview and PERSIST them on the row (ai_questions/ai_questions_at).
 *
 * Two callers share this:
 *   - scheduleInterviewAction — fire-and-forget right after creation, so the
 *     questions are already waiting when the interviewer opens the page;
 *   - generateInterviewQuestionsAction — the "Tạo lại" button.
 */
export async function generateAndPersistInterviewQuestions(interviewId: string): Promise<string[]> {
  const interview = await getInterview(interviewId);
  if (!interview) throw new Error("Không tìm thấy buổi phỏng vấn");
  const [candidate, job] = await Promise.all([
    getCandidate(interview.candidate_id),
    getJob(interview.job_id),
  ]);
  if (!candidate) throw new Error("Không tìm thấy ứng viên");

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
    throw new Error("AI trả về sai định dạng — vui lòng thử lại.");
  }

  const db = await getDb();
  await db
    .update(interviews)
    .set({ ai_questions: questions as never, ai_questions_at: new Date().toISOString() })
    .where(eq(interviews.id, interviewId));

  return questions;
}
