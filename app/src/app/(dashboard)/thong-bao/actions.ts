"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/db";
import { audit_log } from "@/db/schema";
import {
  createAnnouncement,
  togglePinAnnouncement,
  deleteAnnouncement,
  uploadDocument,
  deleteDocument,
  type AnnouncementInput,
} from "@/server/comms/service";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

async function audit(actorId: string, entity: string, entityId: string, action: string) {
  const db = await getDb();
  await db
    .insert(audit_log)
    .values({ entity, entity_id: entityId, action, actor_user_id: actorId })
    .catch(() => {});
}

export async function createAnnouncementAction(
  input: AnnouncementInput,
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    const res = await createAnnouncement(input, profile.id);
    await audit(profile.id, "announcements", res.id, "announcement_create");
    revalidatePath("/thong-bao");
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi đăng thông báo" };
  }
}

export async function togglePinAction(id: string, pinned: boolean): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await togglePinAnnouncement(id, pinned);
    await audit(
      profile.id,
      "announcements",
      id,
      pinned ? "announcement_pin" : "announcement_unpin",
    );
    revalidatePath("/thong-bao");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật" };
  }
}

export async function deleteAnnouncementAction(id: string): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await deleteAnnouncement(id);
    await audit(profile.id, "announcements", id, "announcement_delete");
    revalidatePath("/thong-bao");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi xóa" };
  }
}

export async function uploadDocumentAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    const file = formData.get("file");
    const title = String(formData.get("title") ?? "");
    if (!(file instanceof File)) return { ok: false, error: "Vui lòng chọn tệp." };
    const res = await uploadDocument(
      {
        title,
        description: (formData.get("description") as string) || null,
        category: (formData.get("category") as string) || null,
      },
      {
        buffer: await file.arrayBuffer(),
        mime: file.type,
        originalName: file.name,
        size: file.size,
      },
      profile.id,
    );
    await audit(profile.id, "hr_documents", res.id, "document_upload");
    revalidatePath("/thong-bao");
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tải tài liệu" };
  }
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await deleteDocument(id);
    await audit(profile.id, "hr_documents", id, "document_delete");
    revalidatePath("/thong-bao");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi xóa" };
  }
}
