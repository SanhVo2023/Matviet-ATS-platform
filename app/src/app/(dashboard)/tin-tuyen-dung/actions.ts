"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { JobInputSchema, JobPublishSchema, type JobInput } from "@/lib/validation/job";
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
