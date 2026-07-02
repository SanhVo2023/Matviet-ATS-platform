import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, cv_files, people, stage_history } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { deleteFile, putFile } from "@/lib/r2";
import { cvStoragePath, isAcceptedCvMime, CV_MAX_BYTES } from "@/lib/storage/paths";
import type { CandidateUploadInput } from "@/lib/validation/candidate";
import type { Database, TablesUpdate } from "@/types/db";

type CandidateUpdate = TablesUpdate<"candidates">;
export type Stage = Database["public"]["Enums"]["pipeline_stage"];

export interface UploadedFile {
  buffer: ArrayBuffer;
  mime: string;
  originalName: string;
  size: number;
}

/**
 * ADR 0012 person-linking: find an existing person by exact email (preferred)
 * or phone, else insert a new one. Returns the person id to set on the candidate.
 */
async function upsertPerson(
  db: Awaited<ReturnType<typeof getDb>>,
  input: { full_name: string; email: string | null; phone: string | null },
): Promise<string> {
  if (input.email) {
    const byEmail = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.email, input.email))
      .limit(1)
      .then((r) => r[0] ?? null);
    if (byEmail) return byEmail.id;
  }
  if (input.phone) {
    const byPhone = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.phone, input.phone))
      .limit(1)
      .then((r) => r[0] ?? null);
    if (byPhone) return byPhone.id;
  }
  const inserted = await db
    .insert(people)
    .values({
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      dob: null,
      gender: null,
    })
    .returning({ id: people.id });
  const person = inserted[0];
  if (!person) throw new Error("people insert failed");
  return person.id;
}

/**
 * Atomic-ish upload of a CV + candidate row.
 *
 * 1. Validate MIME + size (server-side, defence in depth)
 * 2. Pre-allocate a candidate UUID so the storage key is stable
 * 3. Upload bytes to R2
 * 4. Upsert `people` (ADR 0012) and insert cv_files row
 * 5. Insert candidates row (+ initial stage_history entry — was a Postgres
 *    trigger, now explicit) referencing cv_file_id and person_id
 *
 * Failure recovery: if a DB step fails after upload, we attempt to delete
 * the orphaned R2 object so storage doesn't accumulate junk. Best-effort.
 *
 * The calling Server Action MUST be guarded with requireRole(['admin','hr']).
 */
export async function uploadCandidateWithCv(
  input: CandidateUploadInput,
  file: UploadedFile,
  uploadedBy: string,
): Promise<{ id: string; cv_file_id: string }> {
  if (!isAcceptedCvMime(file.mime)) {
    throw new Error("Loại file không hỗ trợ. Chỉ chấp nhận PDF.");
  }
  if (file.size <= 0) throw new Error("File trống.");
  if (file.size > CV_MAX_BYTES) {
    throw new Error("File quá lớn. Tối đa 10 MB.");
  }

  const db = await getDb();

  // Pre-allocate the candidate UUID so the storage key is stable + we can clean up on failure
  const candidateId = crypto.randomUUID();
  const storagePath = cvStoragePath(candidateId, file.originalName);

  // 1. Upload to R2
  try {
    await putFile(storagePath, file.buffer, file.mime);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Không tải lên được: ${message}`);
  }

  const cleanup = async () => {
    await deleteFile(storagePath).catch(() => {});
  };

  try {
    const email = input.email?.trim() || null;
    const phone = input.phone?.trim() || null;

    // 2. Person upsert (ADR 0012) — link/create BEFORE the candidate insert
    const personId = await upsertPerson(db, { full_name: input.full_name, email, phone });

    // 3. cv_files insert
    const insertedCv = await db
      .insert(cv_files)
      .values({
        storage_path: storagePath,
        mime: file.mime,
        size_bytes: file.size,
        original_name: file.originalName,
        uploaded_by: uploadedBy,
      })
      .returning({ id: cv_files.id });
    const cvFile = insertedCv[0];
    if (!cvFile) throw new Error("cv_files insert failed");
    const cvFileId = cvFile.id;

    // 4. candidates insert + initial stage_history entry (atomic batch;
    //    the old Postgres trigger wrote stage_history on insert)
    try {
      await db.batch([
        db.insert(candidates).values({
          id: candidateId,
          job_id: input.job_id,
          person_id: personId,
          full_name: input.full_name,
          email,
          phone,
          cv_file_id: cvFileId,
          source: input.source,
          notes: input.notes?.trim() || null,
          created_by: uploadedBy,
          current_stage: "new",
        }),
        db.insert(stage_history).values({
          candidate_id: candidateId,
          from_stage: null,
          to_stage: "new",
          actor_user_id: uploadedBy,
        }),
      ]);
    } catch (candErr) {
      // Roll back the cv_files row too
      await db.delete(cv_files).where(eq(cv_files.id, cvFileId));
      throw candErr;
    }

    return { id: candidateId, cv_file_id: cvFileId };
  } catch (err) {
    await cleanup();
    throw err;
  }
}

/**
 * Update the candidate's current_stage and write stage_history in the same
 * batch (was a Postgres on-update trigger; explicit after the D1 pivot).
 */
export async function changeStage(candidateId: string, nextStage: Stage): Promise<void> {
  const db = await getDb();

  const current = await db
    .select({ stage: candidates.current_stage })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!current) throw new Error("Candidate not found");
  if (current.stage === nextStage) return;

  const actor = await getCurrentProfile();

  await db.batch([
    db.update(candidates).set({ current_stage: nextStage }).where(eq(candidates.id, candidateId)),
    db.insert(stage_history).values({
      candidate_id: candidateId,
      from_stage: current.stage,
      to_stage: nextStage,
      actor_user_id: actor?.id ?? null,
    }),
  ]);
}

export async function archiveCandidate(candidateId: string): Promise<void> {
  const db = await getDb();
  await db.update(candidates).set({ is_archived: true }).where(eq(candidates.id, candidateId));
}

export async function updateCandidateContact(
  candidateId: string,
  patch: Pick<CandidateUpdate, "email" | "phone" | "full_name" | "notes" | "location">,
): Promise<void> {
  const db = await getDb();
  await db.update(candidates).set(patch).where(eq(candidates.id, candidateId));
}
