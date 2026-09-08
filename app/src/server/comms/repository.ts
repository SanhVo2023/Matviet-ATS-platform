import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { announcements, hr_documents, users } from "@/db/schema";
import type { Tables } from "@/types/db";

export type AnnouncementRow = Tables<"announcements">;
export type HrDocumentRow = Tables<"hr_documents">;

export interface AnnouncementItem extends AnnouncementRow {
  author_name: string | null;
}

export async function listAnnouncements(): Promise<AnnouncementItem[]> {
  const db = await getDb();
  const rows = await db
    .select({ a: announcements, author_name: users.name })
    .from(announcements)
    .leftJoin(users, eq(announcements.created_by, users.id))
    .orderBy(desc(announcements.pinned), desc(announcements.created_at));
  return rows.map((r) => ({ ...r.a, author_name: r.author_name ?? null }));
}

export interface HrDocumentItem extends HrDocumentRow {
  uploader_name: string | null;
}

export async function listDocuments(): Promise<HrDocumentItem[]> {
  const db = await getDb();
  const rows = await db
    .select({ d: hr_documents, uploader_name: users.name })
    .from(hr_documents)
    .leftJoin(users, eq(hr_documents.uploaded_by, users.id))
    .orderBy(desc(hr_documents.created_at));
  return rows.map((r) => ({ ...r.d, uploader_name: r.uploader_name ?? null }));
}

export async function getDocument(id: string): Promise<HrDocumentRow | null> {
  const db = await getDb();
  const rows = await db.select().from(hr_documents).where(eq(hr_documents.id, id)).limit(1);
  return rows[0] ?? null;
}
