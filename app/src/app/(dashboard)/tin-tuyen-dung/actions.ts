"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { aiChat } from "@/lib/ai/workers-ai";
import "@/server/ai/runtime";
import { t } from "@/lib/i18n";
import {
  JobInputSchema,
  JobPublishSchema,
  ROLE_FAMILIES,
  type JobInput,
} from "@/lib/validation/job";
import {
  createJobWithAssignments,
  updateJobWithAssignments,
  setJobStatus,
  archiveJob,
} from "@/server/jobs/service";
import { reaggregateScoresForJob } from "@/server/scoring/repository";
import type { Database } from "@/types/db";

type JobStatus = Database["public"]["Enums"]["job_status"];

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export async function createJobAction(
  values: JobInput,
  intent: "save_draft" | "publish",
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["admin", "hr"]);

  const schema = intent === "publish" ? JobPublishSchema : JobInputSchema;
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  try {
    const status: JobStatus = intent === "publish" ? "open" : "draft";
    const { id } = await createJobWithAssignments(parsed.data, status, profile.id);
    revalidatePath("/tin-tuyen-dung");
    revalidatePath("/");
    return { ok: true, data: { id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tạo tin" };
  }
}

export async function updateJobAction(
  id: string,
  values: JobInput,
  intent: "save_draft" | "publish",
): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin", "hr"]);

  const schema = intent === "publish" ? JobPublishSchema : JobInputSchema;
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  try {
    await updateJobWithAssignments(id, parsed.data, intent === "publish");

    // Re-aggregate ai_score for this job's candidates using the (possibly updated)
    // weights — instant, pure SQL, no Gemini call. Cheap enough to run unconditionally.
    try {
      await reaggregateScoresForJob(id, parsed.data.weights);
    } catch (rErr) {
      console.warn("[updateJob] reaggregate failed (scores stale until next screening):", rErr);
    }

    revalidatePath("/tin-tuyen-dung");
    revalidatePath(`/tin-tuyen-dung/${id}`);
    revalidatePath("/ung-vien");
    revalidatePath("/");
    return { ok: true, data: { id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật" };
  }
}

const GenerateJobContentSchema = z.object({
  title: z.string().trim().min(2, "Nhập chức danh trước khi dùng AI").max(200),
  role_family: z.enum(ROLE_FAMILIES),
  location: z.string().trim().max(200).optional().nullable(),
});

/** Strip markdown fences the model sometimes wraps HTML in, keep simple tags only. */
function cleanAiHtml(raw: string): string {
  return raw
    .replace(/```(?:html)?/gi, "")
    .replace(/<\/?(?:script|style|iframe|object|embed)[^>]*>/gi, "")
    .trim();
}

/**
 * AI-draft the job description + requirements from title/role family/location.
 * Fills the form editors only — HR reviews and edits before saving. Never persists.
 */
export async function generateJobContentAction(
  input: unknown,
): Promise<ActionResult<{ description_html: string; requirements_html: string }>> {
  await requireRole(["admin", "hr"]);
  const parsed = GenerateJobContentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const { title, role_family, location } = parsed.data;
  try {
    const { text } = await aiChat(
      [
        {
          role: "system",
          content:
            "Bạn viết tin tuyển dụng tiếng Việt cho Mắt Việt — chuỗi cửa hàng mắt kính bán lẻ tại Việt Nam. " +
            "Giọng chuyên nghiệp, ấm áp, thực tế với thị trường lao động Việt Nam. " +
            "Trả về CHÍNH XÁC định dạng sau, không thêm chữ nào khác:\n" +
            "MOTA:\n<HTML mô tả công việc: 1 đoạn <p> giới thiệu ngắn về vị trí, tiếp theo <p><strong>Nhiệm vụ chính:</strong></p> + <ul> 4-6 <li>, rồi <p><strong>Quyền lợi:</strong></p> + <ul> 3-4 <li>>\n" +
            "YEUCAU:\n<HTML yêu cầu ứng viên: <ul> 4-6 <li> về kinh nghiệm, kỹ năng, thái độ>\n" +
            "Chỉ dùng thẻ <p>, <ul>, <li>, <strong>. Không dùng markdown, không bịa mức lương hay địa chỉ cụ thể.",
        },
        {
          role: "user",
          content: `Chức danh: ${title}. Loại vị trí: ${t.roleFamily[role_family]}. Địa điểm làm việc: ${location?.trim() || "chưa xác định"}.`,
        },
      ],
      { maxTokens: 1400, temperature: 0.5 },
    );
    const m = text.match(/MOTA:\s*([\s\S]*?)\s*YEUCAU:\s*([\s\S]+)/);
    if (!m || !m[1]?.trim() || !m[2]?.trim()) {
      return { ok: false, error: "AI trả về sai định dạng — vui lòng thử lại." };
    }
    return {
      ok: true,
      data: {
        description_html: cleanAiHtml(m[1]),
        requirements_html: cleanAiHtml(m[2]),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tạo nội dung bằng AI" };
  }
}

export async function setJobStatusAction(id: string, status: JobStatus): Promise<ActionResult> {
  await requireRole(["admin", "hr"]);
  try {
    await setJobStatus(id, status);
    revalidatePath("/tin-tuyen-dung");
    revalidatePath(`/tin-tuyen-dung/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật trạng thái" };
  }
}

export async function archiveJobAction(id: string): Promise<ActionResult> {
  await requireRole(["admin", "hr"]);
  try {
    await archiveJob(id);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi xóa tin" };
  }
  revalidatePath("/tin-tuyen-dung");
  redirect("/tin-tuyen-dung");
}
