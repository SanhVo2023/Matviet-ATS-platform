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
    revalidatePath(`/tin-tuyen-dung/${id}`);
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

/**
 * "Đề xuất lên trên" — kicks off the approval flow for a candidate.
 * Lives in interviews actions because the natural trigger point in the UI is
 * after an interview review is filed.
 */
export async function startApprovalAction(candidateId: string): Promise<ActionResult> {
  await requireRole(["admin", "hr", "hiring_manager"]);
  try {
    await startApproval(candidateId);
    revalidatePath(`/ung-vien/${candidateId}`);
    revalidatePath("/phe-duyet");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tạo quy trình duyệt" };
  }
}
