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
): Promise<ActionResult<{ full_name?: string; email?: string; phone?: string }>> {
  const profile = await requireRole(["admin", "hr"]);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > CV_MAX_BYTES) {
    return { ok: false, error: "File không hợp lệ" };
  }
  if (!isAcceptedCvMime(file.type)) {
    return { ok: false, error: "Chỉ hỗ trợ PDF" };
  }

  const result: { full_name?: string; email?: string; phone?: string } = {};
  try {
    const { extractCvText } = await import("@/server/scoring/extract-text");
    const text = await extractCvText(
      file.name,
      new Uint8Array(await file.arrayBuffer()),
      file.type,
    );
    if (text.trim().length < 30) return { ok: true, data: result };

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
        feature: "candidate_summary",
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
