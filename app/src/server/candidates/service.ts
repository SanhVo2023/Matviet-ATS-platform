import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cvStoragePath, isAcceptedCvMime, CV_MAX_BYTES } from "@/lib/storage/paths";
import type { CandidateUploadInput } from "@/lib/validation/candidate";
import type { Database, TablesInsert, TablesUpdate } from "@/types/db";

type CvFileInsert = TablesInsert<"cv_files">;
type CandidateInsert = TablesInsert<"candidates">;
type CandidateUpdate = TablesUpdate<"candidates">;
export type Stage = Database["public"]["Enums"]["pipeline_stage"];

export interface UploadedFile {
  buffer: ArrayBuffer;
  mime: string;
  originalName: string;
  size: number;
}

/**
 * Atomic-ish upload of a CV + candidate row.
 *
 * 1. Validate MIME + size (server-side, defence in depth — bucket policy is
 *    also configured but we fail fast with a friendlier error)
 * 2. Pre-allocate a candidate UUID so the storage path is stable
 * 3. Upload bytes to Storage
 * 4. Insert cv_files row
 * 5. Insert candidates row referencing cv_file_id
 *
 * Failure recovery: if step 4 or 5 fails after upload, we attempt to delete
 * the orphaned object so storage doesn't accumulate junk. Best-effort.
 *
 * Uses admin client for cv_files insert because the RLS write policy for
 * cv_files requires public.is_hr() — service role bypasses but the calling
 * Server Action MUST be guarded with requireRole(['admin','hr']).
 */
export async function uploadCandidateWithCv(
  input: CandidateUploadInput,
  file: UploadedFile,
  uploadedBy: string,
): Promise<{ id: string; cv_file_id: string }> {
  if (!isAcceptedCvMime(file.mime)) {
    throw new Error("Loại file không hỗ trợ. Chỉ chấp nhận PDF hoặc DOCX.");
  }
  if (file.size <= 0) throw new Error("File trống.");
  if (file.size > CV_MAX_BYTES) {
    throw new Error("File quá lớn. Tối đa 10 MB.");
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // Pre-allocate UUIDs so the storage path is stable + we can clean up on failure
  const candidateId = crypto.randomUUID();
  const storagePath = cvStoragePath(candidateId, file.originalName);

  // 1. Upload to Storage
  const { error: uploadErr } = await admin.storage.from("cvs").upload(storagePath, file.buffer, {
    contentType: file.mime,
    upsert: false,
  });
  if (uploadErr) {
    throw new Error(`Không tải lên được: ${uploadErr.message}`);
  }

  const cleanup = async () => {
    await admin.storage
      .from("cvs")
      .remove([storagePath])
      .catch(() => {});
  };

  try {
    // 2. cv_files insert
    const cvInsert: CvFileInsert = {
      storage_path: storagePath,
      mime: file.mime,
      size_bytes: file.size,
      original_name: file.originalName,
      uploaded_by: uploadedBy,
    };
    const { data: cvFile, error: cvErr } = await admin
      .from("cv_files")
      .insert(cvInsert as never)
      .select("id")
      .single();
    if (cvErr || !cvFile) throw cvErr ?? new Error("cv_files insert failed");
    const cvFileId = (cvFile as { id: string }).id;

    // 3. candidates insert
    const candidateInsert: CandidateInsert = {
      id: candidateId,
      job_id: input.job_id,
      full_name: input.full_name,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      cv_file_id: cvFileId,
      source: input.source,
      notes: input.notes?.trim() || null,
      created_by: uploadedBy,
      current_stage: "new",
    };
    const { error: candErr } = await supabase.from("candidates").insert(candidateInsert as never);
    if (candErr) {
      // Roll back cv_files row too — admin client bypasses RLS
      await admin.from("cv_files").delete().eq("id", cvFileId);
      throw candErr;
    }

    return { id: candidateId, cv_file_id: cvFileId };
  } catch (err) {
    await cleanup();
    throw err;
  }
}

/** Update the candidate's current_stage. The on-update trigger writes stage_history. */
export async function changeStage(candidateId: string, nextStage: Stage): Promise<void> {
  const supabase = await createClient();
  const update: CandidateUpdate = { current_stage: nextStage };
  const { error } = await supabase
    .from("candidates")
    .update(update as never)
    .eq("id", candidateId);
  if (error) throw error;
}

export async function archiveCandidate(candidateId: string): Promise<void> {
  const supabase = await createClient();
  const update: CandidateUpdate = { is_archived: true };
  const { error } = await supabase
    .from("candidates")
    .update(update as never)
    .eq("id", candidateId);
  if (error) throw error;
}

export async function updateCandidateContact(
  candidateId: string,
  patch: Pick<CandidateUpdate, "email" | "phone" | "full_name" | "notes" | "location">,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("candidates")
    .update(patch as never)
    .eq("id", candidateId);
  if (error) throw error;
}
