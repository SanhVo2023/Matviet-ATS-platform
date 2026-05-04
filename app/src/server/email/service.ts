import "server-only";
import { renderFromTemplate, renderTemplate, type TemplateVars } from "./templates";
import {
  approveAndQueue as repoApprove,
  cancel as repoCancel,
  enqueueOutbound,
  getEmailDetail,
  resetForManualRetry,
} from "./repository";
import { sendOne } from "./sender";
import { listDrainableEmails } from "./repository";

export interface ComposeFromTemplateInput {
  templateCode: string;
  to: string[];
  cc?: string[];
  vars: TemplateVars;
  candidateId?: string | null;
  jobId?: string | null;
  interviewId?: string | null;
  /** When true, bypass the template's `requires_approval` flag and queue immediately. */
  forceImmediate?: boolean;
  createdBy: string;
}

/**
 * Render a template + queue the email row. Honors the template's `requires_approval`
 * unless `forceImmediate=true`. Subject + body strings already substituted server-side
 * so the queue page shows what the recipient will actually see.
 */
export async function composeFromTemplate(
  input: ComposeFromTemplateInput,
): Promise<{ id: string }> {
  const rendered = await renderFromTemplate(input.templateCode, input.vars);
  const requiresApproval = input.forceImmediate ? false : rendered.requires_approval;
  return enqueueOutbound({
    templateCode: rendered.code,
    candidateId: input.candidateId ?? null,
    jobId: input.jobId ?? null,
    interviewId: input.interviewId ?? null,
    to: input.to,
    cc: input.cc,
    subject: rendered.subject,
    bodyHtml: rendered.body_html,
    requiresApproval,
    createdBy: input.createdBy,
  });
}

export interface ComposeAdHocInput {
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml: string;
  vars?: TemplateVars;
  candidateId?: string | null;
  jobId?: string | null;
  interviewId?: string | null;
  requiresApproval?: boolean;
  createdBy: string;
}

/** Queue an email with a hand-written subject/body. Variables in the strings get substituted. */
export async function composeAdHoc(input: ComposeAdHocInput): Promise<{ id: string }> {
  const subject = input.vars ? renderTemplate(input.subject, input.vars) : input.subject;
  const body = input.vars ? renderTemplate(input.bodyHtml, input.vars) : input.bodyHtml;
  return enqueueOutbound({
    templateCode: null,
    candidateId: input.candidateId ?? null,
    jobId: input.jobId ?? null,
    interviewId: input.interviewId ?? null,
    to: input.to,
    cc: input.cc,
    subject,
    bodyHtml: body,
    requiresApproval: input.requiresApproval ?? false,
    createdBy: input.createdBy,
  });
}

/** Mark a pending_approval row as approved + queue it for the next drain tick. */
export async function approveAndQueue(id: string, actorId: string): Promise<{ id: string }> {
  await repoApprove(id, actorId);
  return { id };
}

/**
 * Bypass the cron and try to send `id` immediately. Used by the "Gửi ngay" button on
 * the queue page when HR doesn't want to wait for the next 5-minute tick.
 */
export async function sendNow(
  id: string,
): Promise<{ result: "sent" | "retried" | "failed"; error?: string }> {
  const row = await getEmailDetail(id);
  if (!row) throw new Error("Email không tồn tại");
  if (row.status !== "queued") {
    throw new Error(
      `Trạng thái hiện tại "${row.status}" — không thể gửi ngay. Cần status='queued'.`,
    );
  }
  const outcome = await sendOne({
    id: row.id,
    candidate_id: row.candidate_id,
    job_id: row.job_id,
    interview_id: row.interview_id,
    template_code: row.template_code,
    to_emails: row.to_emails,
    cc_emails: row.cc_emails,
    subject: row.subject,
    body_html: row.body_html,
    retry_count: row.retry_count,
    in_reply_to: row.in_reply_to,
    conversation_id: row.conversation_id,
  });
  return { result: outcome.result, error: outcome.error };
}

/** HR clicks "Thử lại" on a failed row → reset retry counters + flip back to queued. */
export async function manualRetry(id: string): Promise<void> {
  await resetForManualRetry(id);
}

export async function cancel(id: string, reason: string): Promise<void> {
  await repoCancel(id, reason);
}

/** Read for badges + dashboards. */
export async function getQueueDepth(): Promise<number> {
  const rows = await listDrainableEmails(1000);
  return rows.length;
}
