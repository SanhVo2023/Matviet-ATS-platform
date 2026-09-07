import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, cv_files, people, stage_history, approvals } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { emitAgentEventInBackground, emitAgentEvent } from "@/server/agent-flows/events";
import { deleteFile, putFile } from "@/lib/r2";
import { cvStoragePath, isAcceptedCvMime, CV_MAX_BYTES } from "@/lib/storage/paths";
import type { CandidateUploadInput } from "@/lib/validation/candidate";
import { isValidTransition, type Stage } from "@/lib/stages";
import type { RejectionReason } from "@/lib/stages";
import type { TablesUpdate } from "@/types/db";

type CandidateUpdate = TablesUpdate<"candidates">;
export type { Stage };

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
 * The calling Server Action MUST be guarded with requireRole(['admin','hr']) —
 * EXCEPT the public careers-page path (G12), which passes uploadedBy=null and
 * enforces its own rate-limit + consent in server/apply.
 */
export async function uploadCandidateWithCv(
  input: CandidateUploadInput,
  file: UploadedFile,
  uploadedBy: string | null,
  extras?: { consent_at?: string; source_meta?: Record<string, string | number | boolean> },
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
          source_meta: extras?.source_meta ?? {},
          consent_at: extras?.consent_at ?? null,
          notes: input.notes?.trim() || null,
          created_by: uploadedBy,
          current_stage: "intake",
        }),
        db.insert(stage_history).values({
          candidate_id: candidateId,
          from_stage: null,
          to_stage: "intake",
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

export interface TransitionOpts {
  /** null = system / public (offer link, cron). Omitted → current session. */
  actorUserId?: string | null;
  /** REQUIRED when moving to 'rejected'. */
  reason?: RejectionReason;
  /** Free-text note stored on the stage_history row. */
  notes?: string | null;
  /** How the agent event fires. Default background; scoring worker awaits. */
  emit?: "background" | "await" | "none";
}

/**
 * THE single stage writer (renovation R1). Guards transitions against
 * ALLOWED_TRANSITIONS, requires a reason for rejection, cancels a pending
 * approval chain when leaving `approving` for anywhere but `offer` (kills the
 * old drag-out trap + orphaned-pending-step bug), and always writes
 * stage_history so the journey / reports funnel / agent staleness stay honest.
 *
 * Returns { changed:false } when already in `to` (lets "bump if earlier"
 * callers stay safe no-ops).
 */
export async function transitionStage(
  candidateId: string,
  to: Stage,
  opts: TransitionOpts = {},
): Promise<{ changed: boolean; from: Stage }> {
  const db = await getDb();

  const current = await db
    .select({ stage: candidates.current_stage })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!current) throw new Error("Không tìm thấy ứng viên");
  const from = current.stage;
  if (from === to) return { changed: false, from };

  if (!isValidTransition(from, to)) {
    throw new Error(`Không thể chuyển giai đoạn từ "${from}" sang "${to}".`);
  }
  if (to === "rejected" && !opts.reason) {
    throw new Error("Cần chọn lý do từ chối.");
  }

  const actorUserId =
    opts.actorUserId !== undefined ? opts.actorUserId : ((await getCurrentProfile())?.id ?? null);

  const candidatePatch: CandidateUpdate = { current_stage: to };
  if (to === "rejected") candidatePatch.rejection_reason = opts.reason ?? null;

  const ops: unknown[] = [
    db.update(candidates).set(candidatePatch).where(eq(candidates.id, candidateId)),
    db.insert(stage_history).values({
      candidate_id: candidateId,
      from_stage: from,
      to_stage: to,
      actor_user_id: actorUserId,
      notes: opts.notes ?? null,
    }),
  ];

  // Leaving the approval column for anywhere but `offer` cancels the live
  // chain, so /phe-duyet and the kanban stop showing ghost pending steps.
  if (from === "approving" && to !== "offer") {
    ops.push(
      db
        .update(approvals)
        .set({ status: "cancelled" })
        .where(and(eq(approvals.candidate_id, candidateId), eq(approvals.status, "pending"))),
    );
  }

  await db.batch(ops as unknown as Parameters<typeof db.batch>[0]);

  if (opts.emit === "await") {
    await emitAgentEvent({ type: "stage_changed", candidateId, toStage: to });
  } else if (opts.emit !== "none") {
    emitAgentEventInBackground({ type: "stage_changed", candidateId, toStage: to });
  }

  return { changed: true, from };
}

/** @deprecated use transitionStage. Thin shim kept for a few call sites. */
export async function changeStage(candidateId: string, nextStage: Stage): Promise<void> {
  await transitionStage(candidateId, nextStage);
}

export async function archiveCandidate(candidateId: string): Promise<void> {
  const db = await getDb();
  await db.update(candidates).set({ is_archived: true }).where(eq(candidates.id, candidateId));
  // ADR 0020: archive = supersede every open agent card + stop the DO watch.
  emitAgentEventInBackground({ type: "candidate_archived", candidateId });
}

export async function updateCandidateContact(
  candidateId: string,
  patch: Pick<CandidateUpdate, "email" | "phone" | "full_name" | "notes" | "location">,
): Promise<void> {
  const db = await getDb();
  await db.update(candidates).set(patch).where(eq(candidates.id, candidateId));
}
