"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { CandidateUploadSchema } from "@/lib/validation/candidate";
import { ALL_STAGES, allowedNextStages, type Stage } from "@/lib/validation/candidate";
import {
  uploadCandidateWithCv,
  changeStage,
  archiveCandidate,
  updateCandidateContact,
} from "@/server/candidates/service";
import { getCandidate } from "@/server/candidates/repository";
import { CV_MAX_BYTES, isAcceptedCvMime } from "@/lib/storage/paths";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Server-side multipart handler for the upload-CV form. Validates everything
 * server-side (MIME, size, fields) regardless of what the client sent.
 */
export async function uploadCandidateAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["admin", "hr"]);

  // Pull fields
  const fields = {
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    job_id: String(formData.get("job_id") ?? ""),
    source: (formData.get("source") as string) || "manual_upload",
    notes: String(formData.get("notes") ?? ""),
  };

  const parsed = CandidateUploadSchema.safeParse(fields);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Vui lòng chọn file CV." };
  }
  if (!isAcceptedCvMime(file.type)) {
    return { ok: false, error: "Loại file không hỗ trợ. Chỉ chấp nhận PDF hoặc DOCX." };
  }
  if (file.size > CV_MAX_BYTES) {
    return { ok: false, error: "File quá lớn. Tối đa 10 MB." };
  }
  if (file.size === 0) {
    return { ok: false, error: "File trống." };
  }

  try {
    const buffer = await file.arrayBuffer();
    const { id } = await uploadCandidateWithCv(
      parsed.data,
      {
        buffer,
        mime: file.type,
        originalName: file.name,
        size: file.size,
      },
      profile.id,
    );
    revalidatePath("/ung-vien");
    revalidatePath("/tin-tuyen-dung");
    revalidatePath(`/tin-tuyen-dung/${parsed.data.job_id}`);
    return { ok: true, data: { id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tải lên" };
  }
}

export async function changeStageAction(
  candidateId: string,
  nextStage: Stage,
): Promise<ActionResult> {
  await requireRole(["admin", "hr", "hiring_manager"]);

  if (!ALL_STAGES.includes(nextStage)) {
    return { ok: false, error: "Giai đoạn không hợp lệ" };
  }

  // Server-side enforcement of the same allowed-transition rules the UI exposes
  const candidate = await getCandidate(candidateId);
  if (!candidate) return { ok: false, error: "Không tìm thấy ứng viên" };
  const allowed = allowedNextStages(candidate.current_stage as Stage);
  if (!allowed.includes(nextStage)) {
    return { ok: false, error: "Không thể chuyển sang giai đoạn này" };
  }

  try {
    await changeStage(candidateId, nextStage);
    revalidatePath("/ung-vien");
    revalidatePath(`/ung-vien/${candidateId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật" };
  }
}

export async function archiveCandidateAction(candidateId: string): Promise<ActionResult> {
  await requireRole(["admin", "hr"]);
  try {
    await archiveCandidate(candidateId);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi xóa" };
  }
  revalidatePath("/ung-vien");
  redirect("/ung-vien");
}

export async function updateCandidateContactAction(
  candidateId: string,
  patch: { full_name?: string; email?: string; phone?: string; notes?: string; location?: string },
): Promise<ActionResult> {
  await requireRole(["admin", "hr"]);
  try {
    await updateCandidateContact(candidateId, {
      full_name: patch.full_name?.trim() || undefined,
      email: patch.email?.trim() || null,
      phone: patch.phone?.trim() || null,
      notes: patch.notes?.trim() || null,
      location: patch.location?.trim() || null,
    });
    revalidatePath(`/ung-vien/${candidateId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật" };
  }
}
