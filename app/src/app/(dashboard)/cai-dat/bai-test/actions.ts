"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  ASSESSMENT_FILE_MAX_BYTES,
  CreateAssessmentSchema,
  isAcceptedAssessmentMime,
} from "@/lib/validation/assessment";
import { createAssessment } from "@/server/assessments/service";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Create or replace the active assessment for a job. Multipart form:
 *   job_id, instructions, time_limit_min, file (PDF, ≤ 20 MB)
 */
export async function createAssessmentAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["admin", "hr"]);

  const fields = {
    job_id: String(formData.get("job_id") ?? ""),
    instructions: String(formData.get("instructions") ?? "").trim(),
    time_limit_min: (() => {
      const v = formData.get("time_limit_min");
      if (v == null || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? Math.round(n) : undefined;
    })(),
  };

  const parsed = CreateAssessmentSchema.safeParse(fields);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Vui lòng chọn file đề bài." };
  if (!isAcceptedAssessmentMime(file.type)) {
    return { ok: false, error: "Loại file không hỗ trợ. Chỉ chấp nhận PDF." };
  }
  if (file.size <= 0) return { ok: false, error: "File trống." };
  if (file.size > ASSESSMENT_FILE_MAX_BYTES) {
    return { ok: false, error: "File quá lớn. Tối đa 20 MB." };
  }

  try {
    const buffer = await file.arrayBuffer();
    const { id } = await createAssessment(
      parsed.data,
      { buffer, mime: file.type, originalName: file.name, size: file.size },
      profile.id,
    );
    revalidatePath(`/cai-dat/bai-test/${parsed.data.job_id}`);
    revalidatePath(`/vi-tri/${parsed.data.job_id}`);
    return { ok: true, data: { id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tải lên" };
  }
}
