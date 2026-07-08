"use server";

import { z } from "zod";
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
import { enqueueScoring } from "@/server/scoring/repository";
import { triggerEdgeFunction } from "@/server/scoring/orchestration";

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
    return { ok: false, error: "Loại file không hỗ trợ. Chỉ chấp nhận PDF." };
  }
  if (file.size > CV_MAX_BYTES) {
    return { ok: false, error: "File quá lớn. Tối đa 10 MB." };
  }
  if (file.size === 0) {
    return { ok: false, error: "File trống." };
  }

  try {
    const buffer = await file.arrayBuffer();
    const { id, cv_file_id } = await uploadCandidateWithCv(
      parsed.data,
      {
        buffer,
        mime: file.type,
        originalName: file.name,
        size: file.size,
      },
      profile.id,
    );

    // Seed the CV→MD cache with the prefill extraction (ADR 0017): the
    // dialog already converted this exact file once — don't pay for it again
    // in the scoring worker.
    const prefillMd = String(formData.get("cv_md") ?? "");
    if (prefillMd.trim().length >= 50) {
      const { storeCvMarkdown } = await import("@/server/scoring/extract-text");
      await storeCvMarkdown({ cvFileId: cv_file_id, candidateId: id, md: prefillMd }).catch((err) =>
        console.warn("[upload] cv_md seed failed:", err),
      );
    }

    // Kick off async AI scoring. enqueueScoring is idempotent + cheap;
    // triggerEdgeFunction is fire-and-forget so the user gets the response back fast.
    try {
      await enqueueScoring(id, profile.id);
      triggerEdgeFunction(id);
    } catch (scoreErr) {
      // Don't fail the upload if scoring enqueue hiccups — the cron drain will pick it up.
      console.warn("[upload] scoring enqueue failed (drain will retry):", scoreErr);
    }

    revalidatePath("/ung-vien");
    revalidatePath("/vi-tri");
    revalidatePath(`/vi-tri/${parsed.data.job_id}`);
    return { ok: true, data: { id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tải lên" };
  }
}

/**
 * Bulk PDF intake (ADR 0017): drop N CVs → N candidates NOW, names derived
 * from filenames with source_meta.name_pending=true; the scoring worker's
 * parse pass backfills real name/email/phone into EMPTY slots only.
 */
export async function bulkUploadCandidatesAction(
  formData: FormData,
): Promise<ActionResult<{ created: number; failed: Array<{ file: string; error: string }> }>> {
  const profile = await requireRole(["admin", "hr"]);

  const jobId = String(formData.get("job_id") ?? "");
  if (!z.string().uuid().safeParse(jobId).success) {
    return { ok: false, error: "Vị trí không hợp lệ" };
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return { ok: false, error: "Chưa chọn file nào." };
  if (files.length > 20) return { ok: false, error: "Tối đa 20 CV mỗi lần." };

  let created = 0;
  const failed: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    try {
      if (!isAcceptedCvMime(file.type)) throw new Error("Chỉ chấp nhận PDF");
      if (file.size === 0) throw new Error("File trống");
      if (file.size > CV_MAX_BYTES) throw new Error("Quá 10 MB");

      const { id } = await uploadCandidateWithCv(
        {
          full_name: nameFromFilename(file.name),
          email: "",
          phone: "",
          job_id: jobId,
          source: "manual_upload",
          notes: "",
        },
        {
          buffer: await file.arrayBuffer(),
          mime: file.type,
          originalName: file.name,
          size: file.size,
        },
        profile.id,
        { source_meta: { name_pending: true, bulk_pdf: true } },
      );
      try {
        await enqueueScoring(id, profile.id);
        triggerEdgeFunction(id);
      } catch (scoreErr) {
        console.warn("[bulk-upload] enqueue failed (drain will retry):", scoreErr);
      }
      created++;
    } catch (err) {
      failed.push({
        file: file.name,
        error: err instanceof Error ? err.message : "Lỗi tải lên",
      });
    }
  }

  revalidatePath("/ung-vien");
  revalidatePath(`/vi-tri/${jobId}`);
  return { ok: true, data: { created, failed } };
}

/** "Nguyen_Van_A-CV.pdf" → "Nguyen Van A" (placeholder until AI backfills). */
function nameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const cleaned = base
    .replace(/[-_.]+/g, " ")
    .replace(/\b(cv|resume|ho so|hồ sơ)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || base || "Ứng viên mới").slice(0, 120);
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

// ---------------------------------------------------------------------------
// CV-drop prefill (ADR 0015 — "HR confirms, AI types")
// ---------------------------------------------------------------------------

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const VN_PHONE_RE = /(?:\+?84|0)(?:[\s.\-()]?\d){8,10}/;

/**
 * Extract name/email/phone from a dropped CV so HR confirms instead of
 * typing. Regex catches email+phone instantly; one small AI call fills the
 * name (and anything regex missed). Best-effort by contract — any failure
 * returns whatever was found so the upload is never blocked.
 */
export async function prefillFromCvAction(
  formData: FormData,
): Promise<ActionResult<{ full_name?: string; email?: string; phone?: string; cv_md?: string }>> {
  const profile = await requireRole(["admin", "hr"]);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > CV_MAX_BYTES) {
    return { ok: false, error: "File không hợp lệ" };
  }
  if (!isAcceptedCvMime(file.type)) {
    return { ok: false, error: "Chỉ hỗ trợ PDF" };
  }

  const result: { full_name?: string; email?: string; phone?: string; cv_md?: string } = {};
  try {
    const { extractCvText, CV_MD_MAX } = await import("@/server/scoring/extract-text");
    const text = await extractCvText(
      file.name,
      new Uint8Array(await file.arrayBuffer()),
      file.type,
    );
    if (text.trim().length < 30) return { ok: true, data: result };
    // Hand the markdown back so the submit can seed the CV→MD cache (ADR
    // 0017) — this file never gets converted twice.
    result.cv_md = text.slice(0, CV_MD_MAX);

    const emailMatch = text.match(EMAIL_RE);
    if (emailMatch) result.email = emailMatch[0].toLowerCase();
    const phoneMatch = text.match(VN_PHONE_RE);
    if (phoneMatch) {
      const digits = phoneMatch[0].replace(/\D/g, "").replace(/^84/, "0");
      if (digits.length >= 9 && digits.length <= 11) result.phone = digits;
    }

    try {
      const { aiJson } = await import("@/lib/ai/workers-ai");
      const { data } = await aiJson({
        system:
          "Trích xuất thông tin liên hệ từ CV. Trả về JSON: full_name (họ tên ứng viên, đúng dấu tiếng Việt), email, phone. Không tìm thấy thì để chuỗi rỗng. KHÔNG bịa.",
        user: text.slice(0, 3000),
        jsonSchema: {
          type: "object",
          properties: {
            full_name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
          },
          required: ["full_name", "email", "phone"],
        },
        zod: z.object({
          full_name: z.string().max(120),
          email: z.string().max(200),
          phone: z.string().max(30),
        }),
        maxTokens: 2048,
        temperature: 0,
        feature: "cv_prefill",
        userId: profile.id,
      });
      if (data.full_name.trim().length >= 2) result.full_name = data.full_name.trim();
      if (!result.email && EMAIL_RE.test(data.email)) result.email = data.email.toLowerCase();
      if (!result.phone && data.phone.replace(/\D/g, "").length >= 9) {
        result.phone = data.phone.replace(/\D/g, "").replace(/^84/, "0");
      }
    } catch (aiErr) {
      console.warn("[prefill] AI pass failed, regex-only result:", aiErr);
    }
  } catch (err) {
    console.warn("[prefill] extraction failed:", err);
  }
  return { ok: true, data: result };
}
