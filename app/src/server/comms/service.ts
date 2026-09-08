import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { announcements, hr_documents } from "@/db/schema";
import { putFile, deleteFile } from "@/lib/r2";
import { documentStoragePath, isAcceptedDocMime, DOC_MAX_BYTES } from "@/lib/storage/paths";
import { getDocument } from "./repository";

export interface AnnouncementInput {
  title: string;
  body: string;
  pinned?: boolean;
}

export async function createAnnouncement(
  input: AnnouncementInput,
  createdBy: string | null,
): Promise<{ id: string }> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) throw new Error("Tiêu đề không được để trống.");
  if (!body) throw new Error("Nội dung không được để trống.");
  const db = await getDb();
  const inserted = await db
    .insert(announcements)
    .values({ title, body, pinned: input.pinned ?? false, created_by: createdBy })
    .returning({ id: announcements.id });
  const id = inserted[0]?.id;
  if (!id) throw new Error("Không tạo được thông báo.");
  return { id };
}

export async function togglePinAnnouncement(id: string, pinned: boolean): Promise<void> {
  const db = await getDb();
  await db.update(announcements).set({ pinned }).where(eq(announcements.id, id));
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(announcements).where(eq(announcements.id, id));
}

export interface UploadedDocFile {
  buffer: ArrayBuffer;
  mime: string;
  originalName: string;
  size: number;
}

export async function uploadDocument(
  meta: { title: string; description?: string | null; category?: string | null },
  file: UploadedDocFile,
  uploadedBy: string | null,
): Promise<{ id: string }> {
  const title = meta.title.trim();
  if (!title) throw new Error("Tiêu đề tài liệu không được để trống.");
  if (!isAcceptedDocMime(file.mime)) throw new Error("Loại tệp không hỗ trợ.");
  if (file.size <= 0) throw new Error("Tệp trống.");
  if (file.size > DOC_MAX_BYTES) throw new Error("Tệp quá lớn. Tối đa 10 MB.");

  const db = await getDb();
  const id = crypto.randomUUID();
  const key = documentStoragePath(id, file.originalName);

  await putFile(key, file.buffer, file.mime);
  try {
    await db.insert(hr_documents).values({
      id,
      title,
      description: meta.description?.trim() || null,
      category: meta.category?.trim() || null,
      storage_path: key,
      original_name: file.originalName,
      mime: file.mime,
      size_bytes: file.size,
      uploaded_by: uploadedBy,
    });
  } catch (err) {
    await deleteFile(key).catch(() => {});
    throw err;
  }
  return { id };
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb();
  const doc = await getDocument(id);
  if (!doc) return;
  await db.delete(hr_documents).where(eq(hr_documents.id, id));
  await deleteFile(doc.storage_path).catch(() => {});
}
