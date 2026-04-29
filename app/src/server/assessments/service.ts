import "server-only";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/types/env";
import {
  ASSESSMENT_TOKEN_EXPIRY_MS,
  ASSESSMENT_FILE_MAX_BYTES,
  isAcceptedAssessmentMime,
  type CreateAssessmentInput,
  type GradeSubmissionInput,
} from "@/lib/validation/assessment";
import { assessmentTestStoragePath, assessmentSubmissionStoragePath } from "@/lib/storage/paths";
import type { TablesInsert, TablesUpdate } from "@/types/db";

type AssessmentInsert = TablesInsert<"assessments">;
type AssessmentUpdate = TablesUpdate<"assessments">;
type SubmissionInsert = TablesInsert<"assessment_submissions">;
type SubmissionUpdate = TablesUpdate<"assessment_submissions">;
type TokenInsert = TablesInsert<"assessment_invite_tokens">;
type TokenUpdate = TablesUpdate<"assessment_invite_tokens">;
type EmailInsert = TablesInsert<"email_messages">;
type CandidateUpdate = TablesUpdate<"candidates">;

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
 * Uploads the test file to the `assessments` bucket. On any DB failure the
 * uploaded object is deleted so storage doesn't accumulate orphans.
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

  const supabase = await createClient();
  const admin = createAdminClient();

  // Deactivate any existing active assessment for this job (one-active-per-job)
  const deactivate: AssessmentUpdate = { is_active: false };
  await supabase
    .from("assessments")
    .update(deactivate as never)
    .eq("job_id", input.job_id)
    .eq("is_active", true);

  const assessmentId = crypto.randomUUID();
  const storagePath = assessmentTestStoragePath(assessmentId, file.originalName);

  // 1. Upload to Storage
  const { error: uploadErr } = await admin.storage
    .from("assessments")
    .upload(storagePath, file.buffer, { contentType: file.mime, upsert: false });
  if (uploadErr) throw new Error(`Không tải lên được đề bài: ${uploadErr.message}`);

  const cleanup = async () =>
    admin.storage
      .from("assessments")
      .remove([storagePath])
      .catch(() => {});

  try {
    // 2. Insert assessments row
    const insert: AssessmentInsert = {
      id: assessmentId,
      job_id: input.job_id,
      test_storage_path: storagePath,
      original_name: file.originalName,
      instructions: input.instructions?.trim() || null,
      time_limit_min: input.time_limit_min ?? null,
      is_active: true,
      created_by: actorId,
    };
    const { error: insErr } = await supabase.from("assessments").insert(insert as never);
    if (insErr) throw insErr;

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
  const supabase = await createClient();
  const admin = createAdminClient();

  // Validate candidate + load minimum fields
  const { data: candidateRow } = await supabase
    .from("candidates")
    .select("id, full_name, email, job_id, current_stage")
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidateRow) throw new Error("Không tìm thấy ứng viên");
  const candidate = candidateRow as {
    id: string;
    full_name: string;
    email: string | null;
    job_id: string;
    current_stage: string;
  };
  if (!candidate.email) {
    throw new Error("Ứng viên chưa có email — vui lòng cập nhật trước khi gửi bài test.");
  }

  // Validate assessment + share a job_id
  const { data: assessmentRow } = await supabase
    .from("assessments")
    .select("id, job_id, is_active, time_limit_min")
    .eq("id", assessmentId)
    .maybeSingle();
  if (!assessmentRow) throw new Error("Không tìm thấy bài test");
  const assessment = assessmentRow as {
    id: string;
    job_id: string;
    is_active: boolean;
    time_limit_min: number | null;
  };
  if (assessment.job_id !== candidate.job_id) {
    throw new Error("Bài test không thuộc vị trí ứng tuyển này");
  }
  if (!assessment.is_active) {
    throw new Error("Bài test đã ngừng sử dụng");
  }

  // 1. Generate token + insert invite row
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ASSESSMENT_TOKEN_EXPIRY_MS).toISOString();
  const tokenInsert: TokenInsert = {
    token,
    candidate_id: candidate.id,
    assessment_id: assessment.id,
    expires_at: expiresAt,
  };
  const { error: tokErr } = await admin
    .from("assessment_invite_tokens")
    .insert(tokenInsert as never);
  if (tokErr) throw tokErr;

  // 2. Lookup job + HR template + actor name in parallel
  const [jobRes, templateRes, hrRes] = await Promise.all([
    supabase.from("jobs").select("title").eq("id", candidate.job_id).maybeSingle(),
    admin
      .from("email_templates")
      .select("subject_vi, body_html")
      .eq("code", "assessment_send")
      .maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", actorId).maybeSingle(),
  ]);
  const jobTitle = (jobRes.data as { title: string } | null)?.title ?? "";
  const tpl = templateRes.data as { subject_vi: string; body_html: string } | null;
  const hrName = (hrRes.data as { full_name: string | null } | null)?.full_name ?? "Phòng Nhân sự";

  if (!tpl) throw new Error("Mẫu email assessment_send không có sẵn — chạy migration 0010");

  // Build absolute link the candidate clicks
  const signedLink = `${publicEnv.appUrl}/test/${token}`;
  const timeLimit = assessment.time_limit_min
    ? `${assessment.time_limit_min} phút`
    : "không giới hạn";

  const vars: Record<string, string> = {
    candidate_name: candidate.full_name,
    job_title: jobTitle,
    download_link: signedLink,
    time_limit: timeLimit,
    hr_name: hrName,
  };
  const subject = renderTemplate(tpl.subject_vi, vars);
  const body = renderTemplate(tpl.body_html, vars);

  // 3. Insert placeholder submission row + 4. Insert queued email + 5. Update token
  // Use admin client for these to bypass RLS for cross-row consistency.
  const submissionId = crypto.randomUUID();
  const subInsert: SubmissionInsert = {
    id: submissionId,
    candidate_id: candidate.id,
    assessment_id: assessment.id,
    notes: null,
  };
  const { error: subErr } = await admin.from("assessment_submissions").upsert(subInsert as never, {
    onConflict: "candidate_id,assessment_id",
    ignoreDuplicates: false,
  });
  if (subErr) throw subErr;

  const emailInsert: EmailInsert = {
    candidate_id: candidate.id,
    job_id: candidate.job_id,
    direction: "outbound",
    status: "queued",
    template_code: "assessment_send",
    to_emails: [candidate.email],
    subject,
    body_html: body,
    created_by: actorId,
  };
  const { data: emailRow, error: emailErr } = await admin
    .from("email_messages")
    .insert(emailInsert as never)
    .select("id")
    .single();
  if (emailErr) throw emailErr;
  const emailId = (emailRow as { id: string }).id;

  // Link the email to the submission row + the token to the submission
  const subUpdate: SubmissionUpdate = { email_message_id: emailId };
  await admin
    .from("assessment_submissions")
    .update(subUpdate as never)
    .eq("id", submissionId);

  const tokUpdate: TokenUpdate = { submission_id: submissionId };
  await admin
    .from("assessment_invite_tokens")
    .update(tokUpdate as never)
    .eq("token", token);

  // 6. Bump candidate stage if currently earlier than test_sent
  const earlierStages = ["new", "screening", "screened", "interview_scheduled", "interviewed"];
  if (earlierStages.includes(candidate.current_stage)) {
    const candUpdate: CandidateUpdate = { current_stage: "test_sent" };
    await supabase
      .from("candidates")
      .update(candUpdate as never)
      .eq("id", candidate.id);
  }

  return { token, signed_link: signedLink, deadline_at: expiresAt };
}

/**
 * Public-path submission record — called by /api/test/submit with no auth.
 * Validates the token via admin client, uploads the answer file, updates
 * the submission row, marks the token used.
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

  const admin = createAdminClient();

  // Validate token
  const { data: tokRow } = await admin
    .from("assessment_invite_tokens")
    .select("token, candidate_id, assessment_id, submission_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();
  const tk = tokRow as {
    token: string;
    candidate_id: string;
    assessment_id: string;
    submission_id: string | null;
    expires_at: string;
    used_at: string | null;
  } | null;
  if (!tk) throw new Error("Liên kết không hợp lệ");
  if (tk.used_at) throw new Error("Liên kết đã được sử dụng");
  if (new Date(tk.expires_at).getTime() < Date.now()) {
    throw new Error("Liên kết đã hết hạn");
  }
  if (!tk.submission_id) {
    throw new Error("Liên kết chưa gắn với phiếu nộp — vui lòng liên hệ HR");
  }

  // Upload to submissions bucket under <submission_id>/answer-<slug>.<ext>
  const storagePath = assessmentSubmissionStoragePath(tk.submission_id, file.originalName);
  const { error: upErr } = await admin.storage
    .from("submissions")
    .upload(storagePath, file.buffer, { contentType: file.mime, upsert: false });
  if (upErr) throw new Error(`Không tải lên được: ${upErr.message}`);

  // Update submission row + mark token used
  const subUpdate: SubmissionUpdate = {
    submission_storage_path: storagePath,
    submitted_at: new Date().toISOString(),
  };
  const { error: subErr } = await admin
    .from("assessment_submissions")
    .update(subUpdate as never)
    .eq("id", tk.submission_id);
  if (subErr) {
    // Roll back the storage object to avoid orphans
    await admin.storage
      .from("submissions")
      .remove([storagePath])
      .catch(() => {});
    throw subErr;
  }

  const tokUpdate: TokenUpdate = { used_at: new Date().toISOString() };
  await admin
    .from("assessment_invite_tokens")
    .update(tokUpdate as never)
    .eq("token", token);

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

  const admin = createAdminClient();
  const storagePath = assessmentSubmissionStoragePath(submissionId, file.originalName);
  const { error: upErr } = await admin.storage
    .from("submissions")
    .upload(storagePath, file.buffer, { contentType: file.mime, upsert: false });
  if (upErr) throw new Error(`Không tải lên được: ${upErr.message}`);

  const subUpdate: SubmissionUpdate = {
    submission_storage_path: storagePath,
    submitted_at: new Date().toISOString(),
  };
  const { error: subErr } = await admin
    .from("assessment_submissions")
    .update(subUpdate as never)
    .eq("id", submissionId);
  if (subErr) {
    await admin.storage
      .from("submissions")
      .remove([storagePath])
      .catch(() => {});
    throw subErr;
  }
  return { ok: true };
}

export async function gradeSubmission(
  input: GradeSubmissionInput,
  actorId: string,
): Promise<{ ok: true }> {
  const supabase = await createClient();

  const { data: subRow } = await supabase
    .from("assessment_submissions")
    .select("id, candidate_id, submitted_at")
    .eq("id", input.submission_id)
    .maybeSingle();
  const sub = subRow as { id: string; candidate_id: string; submitted_at: string | null } | null;
  if (!sub) throw new Error("Không tìm thấy bài làm");
  if (!sub.submitted_at) throw new Error("Ứng viên chưa nộp bài");

  const update: SubmissionUpdate = {
    score: input.score,
    notes: input.notes?.trim() || null,
    graded_by: actorId,
    graded_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("assessment_submissions")
    .update(update as never)
    .eq("id", input.submission_id);
  if (error) throw error;

  // Bump candidate stage if currently 'test_sent'
  const { data: candRow } = await supabase
    .from("candidates")
    .select("current_stage")
    .eq("id", sub.candidate_id)
    .maybeSingle();
  const stage = (candRow as { current_stage: string } | null)?.current_stage;
  if (stage === "test_sent") {
    const candUpdate: CandidateUpdate = { current_stage: "test_done" };
    await supabase
      .from("candidates")
      .update(candUpdate as never)
      .eq("id", sub.candidate_id);
  }

  return { ok: true };
}

/**
 * Render simple `{{var_name}}` substitutions in an HTML/text template.
 * Bridge until G6 wires up React Email properly. Variables not present in
 * the map are left intact so HR can spot them in the queued email row.
 */
function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? escapeHtml(vars[key]!) : `{{${key}}}`,
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
