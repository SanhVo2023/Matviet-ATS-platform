"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { aiChat } from "@/lib/ai/workers-ai";
import "@/server/ai/runtime";
import {
  approveAndQueue,
  cancel,
  composeAdHoc,
  composeFromTemplate,
  manualRetry,
} from "@/server/email/service";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const ComposeSchema = z
  .object({
    template_code: z.string().trim().min(1).max(60).optional().nullable(),
    candidate_id: z.string().uuid().optional().nullable(),
    job_id: z.string().uuid().optional().nullable(),
    interview_id: z.string().uuid().optional().nullable(),
    to: z.array(z.string().email()).min(1).max(10),
    cc: z.array(z.string().email()).max(10).optional(),
    /**
     * For template-based sends, `subject` and `body_html` are derived from the
     * template — clients send `vars` only. Ad-hoc sends provide subject + body.
     */
    subject: z.string().trim().min(1).max(300).optional(),
    body_html: z.string().trim().min(1).max(50_000).optional(),
    vars: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional(),
    force_immediate: z.boolean().optional(),
  })
  .refine((v) => v.template_code || (v.subject && v.body_html), {
    message: "Cần chọn mẫu hoặc nhập tiêu đề + nội dung",
  });

export async function composeEmailAction(
  input: unknown,
): Promise<ActionResult<{ id: string; status: "queued" | "pending_approval" }>> {
  const profile = await requireRole(["admin", "hr"]);
  const parsed = ComposeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const v = parsed.data;
  try {
    let id: string;
    if (v.template_code) {
      const res = await composeFromTemplate({
        templateCode: v.template_code,
        to: v.to,
        cc: v.cc,
        vars: v.vars ?? {},
        candidateId: v.candidate_id ?? null,
        jobId: v.job_id ?? null,
        interviewId: v.interview_id ?? null,
        forceImmediate: v.force_immediate ?? false,
        createdBy: profile.id,
      });
      id = res.id;
    } else {
      const res = await composeAdHoc({
        to: v.to,
        cc: v.cc,
        subject: v.subject!,
        bodyHtml: v.body_html!,
        vars: v.vars,
        candidateId: v.candidate_id ?? null,
        jobId: v.job_id ?? null,
        interviewId: v.interview_id ?? null,
        requiresApproval: false,
        createdBy: profile.id,
      });
      id = res.id;
    }
    // composeFromTemplate honors the template's requires_approval flag; we
    // don't know that flag here without an extra round-trip, so the toast
    // path on the client uses what the composer already knows.
    const status: "queued" | "pending_approval" =
      v.force_immediate || !v.template_code ? "queued" : "pending_approval";
    revalidatePath("/email");
    if (v.candidate_id) revalidatePath(`/ung-vien/${v.candidate_id}`);
    return { ok: true, data: { id, status } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không lưu được email",
    };
  }
}

const DraftEmailSchema = z.object({
  purpose: z.string().trim().min(3, "Mô tả mục đích email (ít nhất 3 ký tự)").max(500),
  candidate_name: z.string().trim().max(200).optional(),
  job_title: z.string().trim().max(200).optional(),
  extra_context: z.string().trim().max(1000).optional(),
});

/**
 * AI-draft an email (subject + simple HTML body). Fills the composer fields
 * only — nothing is queued or sent until the user submits and (if required)
 * the draft passes approval. Mirrors the agent's draft_email prompt.
 */
export async function draftEmailAction(
  input: unknown,
): Promise<ActionResult<{ subject: string; body_html: string }>> {
  const profile = await requireRole(["admin", "hr"]);
  const parsed = DraftEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const v = parsed.data;
  try {
    const { text } = await aiChat(
      [
        {
          role: "system",
          content:
            "Bạn soạn email tuyển dụng tiếng Việt cho Mắt Việt (chuỗi cửa hàng mắt kính). Giọng chuyên nghiệp, ấm áp, xưng 'Mắt Việt', gọi ứng viên là 'bạn'. Trả về CHÍNH XÁC định dạng:\nSUBJECT: <tiêu đề>\nBODY:\n<nội dung HTML đơn giản dùng thẻ <p>>",
        },
        {
          role: "user",
          content:
            `Ứng viên: ${v.candidate_name || "—"}. Vị trí: ${v.job_title || "—"}. Mục đích: ${v.purpose}.` +
            (v.extra_context ? ` Thông tin thêm: ${v.extra_context}.` : "") +
            ` Ký tên: ${profile.full_name ?? "Phòng Nhân sự"} — Phòng Nhân sự Mắt Việt.`,
        },
      ],
      { maxTokens: 700, temperature: 0.5 },
    );
    const m = text.match(/SUBJECT:\s*(.+)\s*BODY:\s*([\s\S]+)/);
    const subject = m?.[1]?.trim() ?? `Mắt Việt — ${v.purpose}`;
    const bodyHtml = (m?.[2]?.trim() ?? `<p>${text.trim()}</p>`).replace(
      /<\/?(?:script|style|iframe|object|embed)[^>]*>/gi,
      "",
    );
    return { ok: true, data: { subject, body_html: bodyHtml } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không soạn được email bằng AI",
    };
  }
}

export async function approveEmailAction(id: string): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  if (!isUuid(id)) return { ok: false, error: "ID không hợp lệ" };
  try {
    await approveAndQueue(id, profile.id);
    revalidatePath("/email");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không phê duyệt được",
    };
  }
}

export async function manualRetryEmailAction(id: string): Promise<ActionResult> {
  await requireRole(["admin", "hr"]);
  if (!isUuid(id)) return { ok: false, error: "ID không hợp lệ" };
  try {
    await manualRetry(id);
    revalidatePath("/email");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không reset được trạng thái",
    };
  }
}

export async function cancelEmailAction(id: string, reason: string): Promise<ActionResult> {
  await requireRole(["admin", "hr"]);
  if (!isUuid(id)) return { ok: false, error: "ID không hợp lệ" };
  if (!reason || reason.length > 200) {
    return { ok: false, error: "Lý do hủy phải từ 1 đến 200 ký tự" };
  }
  try {
    await cancel(id, reason);
    revalidatePath("/email");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không hủy được",
    };
  }
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
