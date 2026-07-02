import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  assessments,
  assessment_submissions,
  assessment_invite_tokens,
  candidates,
  jobs,
  users,
  email_messages,
} from "@/db/schema";
import { putFile, deleteFile } from "@/lib/r2";
import { publicEnv } from "@/types/env";
import {
  ASSESSMENT_TOKEN_EXPIRY_MS,
  ASSESSMENT_FILE_MAX_BYTES,
  isAcceptedAssessmentMime,
  type CreateAssessmentInput,
  type GradeSubmissionInput,
} from "@/lib/validation/assessment";
import { assessmentTestStoragePath, assessmentSubmissionStoragePath } from "@/lib/storage/paths";
import { renderFromTemplate } from "@/server/email/templates";

export interface UploadedAssessmentFile {
  buffer: ArrayBuffer;
  mime: string;
  originalName: string;
  size: number;
}

/**
 * Create or replace the active assessment for a job. Idempotent on (job_id):
 * any existing active assessment for the job is marked is_active=false first.
 *
 * Uploads the test file to R2 (key keeps the old `assessments` bucket path
 * shape). On any DB failure the uploaded object is deleted so storage doesn't
 * accumulate orphans.
 */
export async function createAssessment(
  input: CreateAssessmentInput,
  file: UploadedAssessmentFile,
  actorId: string,
): Promise<{ id: string }> {
  if (!isAcceptedAssessmentMime(file.mime)) {
    throw new Error("Loại file không hỗ trợ. Chỉ chấp nhận PDF.");
  }
  if (file.size <= 0) throw new Error("File trống.");
  if (file.size > ASSESSMENT_FILE_MAX_BYTES) {
    throw new Error("File quá lớn. Tối đa 20 MB.");
  }

  const db = await getDb();

  // Deactivate any existing active assessment for this job (one-active-per-job)
  await db
    .update(assessments)
    .set({ is_active: false })
    .where(and(eq(assessments.job_id, input.job_id), eq(assessments.is_active, true)));

  const assessmentId = crypto.randomUUID();
  const storagePath = assessmentTestStoragePath(assessmentId, file.originalName);

  // 1. Upload to R2
  try {
    await putFile(storagePath, file.buffer, file.mime);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Không tải lên được đề bài: ${msg}`);
  }

  const cleanup = async () => deleteFile(storagePath).catch(() => {});

  try {
    // 2. Insert assessments row
    await db.insert(assessments).values({
      id: assessmentId,
      job_id: input.job_id,
      test_storage_path: storagePath,
      original_name: file.originalName,
      instructions: input.instructions?.trim() || null,
      time_limit_min: input.time_limit_min ?? null,
      is_active: true,
      created_by: actorId,
    });

    return { id: assessmentId };
  } catch (err) {
    await cleanup();
    throw err;
  }
}

/**
 * Generate a 48h invite token for a candidate, queue an `assessment_send`
 * email_messages row, and return the signed link so HR can paste it manually
 * into Outlook while G6 (email send) is still IT-blocked.
 *
 * Steps:
 *   1. Validate candidate + assessment exist + share a job_id.
 *   2. Insert assessment_invite_tokens row.
 *   3. Insert placeholder assessment_submissions row (so the candidate detail
 *      page shows "Đã gửi" without a real submission yet).
 *   4. Render assessment_send template with substitutions.
 *   5. Insert email_messages row (status='queued').
 *   6. Bump candidate.current_stage to 'test_sent' if currently earlier.
 *   7. Return { token, signed_link, deadline_at }.
 */
export async function sendAssessment(
  candidateId: string,
  assessmentId: string,
  actorId: string,
): Promise<{ token: string; signed_link: string; deadline_at: string }> {
  const db = await getDb();

  // Validate candidate + load minimum fields
  const candidate = await db
    .select({
      id: candidates.id,
      full_name: candidates.full_name,
      email: candidates.email,
      job_id: candidates.job_id,
      current_stage: candidates.current_stage,
    })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!candidate) throw new Error("Không tìm thấy ứng viên");
  if (!candidate.email) {
    throw new Error("Ứng viên chưa có email — vui lòng cập nhật trước khi gửi bài test.");
  }

  // Validate assessment + share a job_id
  const assessment = await db
    .select({
      id: assessments.id,
      job_id: assessments.job_id,
      is_active: assessments.is_active,
      time_limit_min: assessments.time_limit_min,
    })
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!assessment) throw new Error("Không tìm thấy bài test");
  if (assessment.job_id !== candidate.job_id) {
    throw new Error("Bài test không thuộc vị trí ứng tuyển này");
  }
  if (!assessment.is_active) {
    throw new Error("Bài test đã ngừng sử dụng");
  }

  // 1. Generate token + insert invite row
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ASSESSMENT_TOKEN_EXPIRY_MS).toISOString();
  await db.insert(assessment_invite_tokens).values({
    token,
    candidate_id: candidate.id,
    assessment_id: assessment.id,
    expires_at: expiresAt,
  });

  // 2. Lookup job + HR name; the template is rendered by the shared email module.
  const [jobRow, hrRow] = await Promise.all([
    db
      .select({ title: jobs.title })
      .from(jobs)
      .where(eq(jobs.id, candidate.job_id))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({ full_name: users.name })
      .from(users)
      .where(eq(users.id, actorId))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);
  const jobTitle = jobRow?.title ?? "";
  const hrName = hrRow?.full_name ?? "Phòng Nhân sự";

  // Build absolute link the candidate clicks
  const signedLink = `${publicEnv.appUrl}/test/${token}`;
  const timeLimit = assessment.time_limit_min
    ? `${assessment.time_limit_min} phút`
    : "không giới hạn";

  const rendered = await renderFromTemplate("assessment_send", {
    candidate_name: candidate.full_name,
    job_title: jobTitle,
    download_link: signedLink,
    time_limit: timeLimit,
    hr_name: hrName,
  });
  const subject = rendered.subject;
  const body = rendered.body_html;

  // 3. Upsert placeholder submission row (unique on candidate_id + assessment_id)
  const submissionId = crypto.randomUUID();
  await db
    .insert(assessment_submissions)
    .values({
      id: submissionId,
      candidate_id: candidate.id,
      assessment_id: assessment.id,
      notes: null,
    })
    .onConflictDoUpdate({
      target: [assessment_submissions.candidate_id, assessment_submissions.assessment_id],
      set: { id: submissionId, notes: null, updated_at: new Date().toISOString() },
    });

  // 4. Insert queued email
  const emailRow = await db
    .insert(email_messages)
    .values({
      candidate_id: candidate.id,
      job_id: candidate.job_id,
      direction: "outbound",
      status: "queued",
      template_code: "assessment_send",
      to_emails: [candidate.email],
      subject,
      body_html: body,
      created_by: actorId,
    })
    .returning({ id: email_messages.id })
    .then((r) => r[0]);
  if (!emailRow) throw new Error("Không tạo được email");
  const emailId = emailRow.id;

  // 5. Link the email to the submission row + the token to the submission
  await db
    .update(assessment_submissions)
    .set({ email_message_id: emailId })
    .where(eq(assessment_submissions.id, submissionId));

  await db
    .update(assessment_invite_tokens)
    .set({ submission_id: submissionId })
    .where(eq(assessment_invite_tokens.token, token));

  // 6. Bump candidate stage if currently earlier than test_sent
  const earlierStages = [
    "new",
    "screening",
    "screened",
    "interview_scheduled",
    "interviewed",
  ] as const;
  if ((earlierStages as readonly string[]).includes(candidate.current_stage)) {
    await db
      .update(candidates)
      .set({ current_stage: "test_sent" })
      .where(eq(candidates.id, candidate.id));
  }

  return { token, signed_link: signedLink, deadline_at: expiresAt };
}

/**
 * Public-path submission record — called by /api/test/submit with no auth.
 * Validates the token, uploads the answer file to R2, updates the submission
 * row, marks the token used.
 */
export async function recordSubmission(
  token: string,
  file: UploadedAssessmentFile,
): Promise<{ ok: true; submission_id: string }> {
  if (!isAcceptedAssessmentMime(file.mime)) {
    throw new Error("Chỉ chấp nhận file PDF");
  }
  if (file.size <= 0) throw new Error("File trống");
  if (file.size > ASSESSMENT_FILE_MAX_BYTES) {
    throw new Error("File quá lớn. Tối đa 20 MB.");
  }

  const db = await getDb();

  // Validate token
  const tk = await db
    .select({
      token: assessment_invite_tokens.token,
      candidate_id: assessment_invite_tokens.candidate_id,
      assessment_id: assessment_invite_tokens.assessment_id,
      submission_id: assessment_invite_tokens.submission_id,
      expires_at: assessment_invite_tokens.expires_at,
      used_at: assessment_invite_tokens.used_at,
    })
    .from(assessment_invite_tokens)
    .where(eq(assessment_invite_tokens.token, token))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!tk) throw new Error("Liên kết không hợp lệ");
  if (tk.used_at) throw new Error("Liên kết đã được sử dụng");
  if (new Date(tk.expires_at).getTime() < Date.now()) {
    throw new Error("Liên kết đã hết hạn");
  }
  if (!tk.submission_id) {
    throw new Error("Liên kết chưa gắn với phiếu nộp — vui lòng liên hệ HR");
  }

  // Upload to R2 under <submission_id>/answer-<slug>.<ext>
  const storagePath = assessmentSubmissionStoragePath(tk.submission_id, file.originalName);
  try {
    await putFile(storagePath, file.buffer, file.mime);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Không tải lên được: ${msg}`);
  }

  // Update submission row + mark token used
  try {
    await db
      .update(assessment_submissions)
      .set({
        submission_storage_path: storagePath,
        submitted_at: new Date().toISOString(),
      })
      .where(eq(assessment_submissions.id, tk.submission_id));
  } catch (err) {
    // Roll back the storage object to avoid orphans
    await deleteFile(storagePath).catch(() => {});
    throw err;
  }

  await db
    .update(assessment_invite_tokens)
    .set({ used_at: new Date().toISOString() })
    .where(eq(assessment_invite_tokens.token, token));

  return { ok: true, submission_id: tk.submission_id };
}

/**
 * HR-side path: HR uploads the candidate's answer file on their behalf
 * (e.g. when the candidate emailed the answer instead of using the public form).
 * Same effect as recordSubmission but goes through HR auth.
 */
export async function uploadAnswerOnBehalf(
  submissionId: string,
  file: UploadedAssessmentFile,
): Promise<{ ok: true }> {
  if (!isAcceptedAssessmentMime(file.mime)) {
    throw new Error("Chỉ chấp nhận file PDF");
  }
  if (file.size <= 0) throw new Error("File trống");
  if (file.size > ASSESSMENT_FILE_MAX_BYTES) {
    throw new Error("File quá lớn. Tối đa 20 MB.");
  }

  const db = await getDb();
  const storagePath = assessmentSubmissionStoragePath(submissionId, file.originalName);
  try {
    await putFile(storagePath, file.buffer, file.mime);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Không tải lên được: ${msg}`);
  }

  try {
    await db
      .update(assessment_submissions)
      .set({
        submission_storage_path: storagePath,
        submitted_at: new Date().toISOString(),
      })
      .where(eq(assessment_submissions.id, submissionId));
  } catch (err) {
    await deleteFile(storagePath).catch(() => {});
    throw err;
  }
  return { ok: true };
}

export async function gradeSubmission(
  input: GradeSubmissionInput,
  actorId: string,
): Promise<{ ok: true }> {
  const db = await getDb();

  const sub = await db
    .select({
      id: assessment_submissions.id,
      candidate_id: assessment_submissions.candidate_id,
      submitted_at: assessment_submissions.submitted_at,
    })
    .from(assessment_submissions)
    .where(eq(assessment_submissions.id, input.submission_id))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!sub) throw new Error("Không tìm thấy bài làm");
  if (!sub.submitted_at) throw new Error("Ứng viên chưa nộp bài");

  await db
    .update(assessment_submissions)
    .set({
      score: input.score,
      notes: input.notes?.trim() || null,
      graded_by: actorId,
      graded_at: new Date().toISOString(),
    })
    .where(eq(assessment_submissions.id, input.submission_id));

  // Bump candidate stage if currently 'test_sent'
  const cand = await db
    .select({ current_stage: candidates.current_stage })
    .from(candidates)
    .where(eq(candidates.id, sub.candidate_id))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (cand?.current_stage === "test_sent") {
    await db
      .update(candidates)
      .set({ current_stage: "test_done" })
      .where(eq(candidates.id, sub.candidate_id));
  }

  return { ok: true };
}
