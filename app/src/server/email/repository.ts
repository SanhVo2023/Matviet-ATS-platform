import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database, TablesInsert, TablesUpdate } from "@/types/db";

type EmailMessageRow = Database["public"]["Tables"]["email_messages"]["Row"];
type EmailMessageInsert = TablesInsert<"email_messages">;
type EmailMessageUpdate = TablesUpdate<"email_messages">;
export type EmailStatus = Database["public"]["Enums"]["email_status"];

const DRAINABLE_COLUMNS =
  "id, candidate_id, job_id, interview_id, template_code, to_emails, cc_emails, subject, body_html, retry_count, in_reply_to, conversation_id" as const;

export type DrainableEmail = Pick<
  EmailMessageRow,
  | "id"
  | "candidate_id"
  | "job_id"
  | "interview_id"
  | "template_code"
  | "to_emails"
  | "cc_emails"
  | "subject"
  | "body_html"
  | "retry_count"
  | "in_reply_to"
  | "conversation_id"
>;

/**
 * Pick up to `limit` queued messages whose retry-after has elapsed.
 * Ordered FIFO so the oldest queued email goes first.
 */
export async function listDrainableEmails(limit: number): Promise<DrainableEmail[]> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("email_messages")
    .select(DRAINABLE_COLUMNS)
    .eq("status", "queued")
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DrainableEmail[];
}

/**
 * Mark a message as sent. The Graph `/sendMail` endpoint returns 202 with no
 * body, so `graphMessageId` is always null on outbound until the inbound poller
 * (G6.5) backfills it via Sent Items match.
 */
export async function markSent(
  id: string,
  options: { graphMessageId?: string | null; conversationId?: string | null } = {},
): Promise<void> {
  const admin = createAdminClient();
  const update: EmailMessageUpdate = {
    status: "sent",
    sent_at: new Date().toISOString(),
    error: null,
    next_retry_at: null,
    graph_message_id: options.graphMessageId ?? null,
    conversation_id: options.conversationId ?? undefined,
  };
  const { error } = await admin
    .from("email_messages")
    .update(update as never)
    .eq("id", id);
  if (error) throw error;
}

/** Move to status='failed' with the rendered error so HR can read it on the queue page. */
export async function markFailed(id: string, errorMessage: string): Promise<void> {
  const admin = createAdminClient();
  const update: EmailMessageUpdate = {
    status: "failed",
    error: errorMessage.slice(0, 2000),
    next_retry_at: null,
  };
  const { error } = await admin
    .from("email_messages")
    .update(update as never)
    .eq("id", id);
  if (error) throw error;
}

/** Keep status='queued' but bump retry_count + push next_retry_at into the future. */
export async function bumpRetry(
  id: string,
  retryCount: number,
  nextRetryAt: Date,
  errorMessage: string,
): Promise<void> {
  const admin = createAdminClient();
  const update: EmailMessageUpdate = {
    retry_count: retryCount,
    next_retry_at: nextRetryAt.toISOString(),
    error: errorMessage.slice(0, 2000),
  };
  const { error } = await admin
    .from("email_messages")
    .update(update as never)
    .eq("id", id);
  if (error) throw error;
}

/** Reset retry_count + next_retry_at + error on a manual "Thử lại" click from HR. */
export async function resetForManualRetry(id: string): Promise<void> {
  const admin = createAdminClient();
  const update: EmailMessageUpdate = {
    status: "queued",
    retry_count: 0,
    next_retry_at: null,
    error: null,
  };
  const { error } = await admin
    .from("email_messages")
    .update(update as never)
    .eq("id", id);
  if (error) throw error;
}

export interface EnqueueInput {
  templateCode?: string | null;
  candidateId?: string | null;
  jobId?: string | null;
  interviewId?: string | null;
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml: string;
  /** When true, the row is staged at status='pending_approval' until an HR/admin approves it. */
  requiresApproval?: boolean;
  inReplyTo?: string | null;
  conversationId?: string | null;
  scheduledSendAt?: Date | null;
  createdBy: string;
}

/** Insert one outbound email_messages row in queued (or pending_approval) state. */
export async function enqueueOutbound(input: EnqueueInput): Promise<{ id: string }> {
  const admin = createAdminClient();
  const insert: EmailMessageInsert = {
    template_code: input.templateCode ?? null,
    candidate_id: input.candidateId ?? null,
    job_id: input.jobId ?? null,
    interview_id: input.interviewId ?? null,
    direction: "outbound",
    status: input.requiresApproval ? "pending_approval" : "queued",
    to_emails: input.to,
    cc_emails: input.cc ?? [],
    subject: input.subject,
    body_html: input.bodyHtml,
    in_reply_to: input.inReplyTo ?? null,
    conversation_id: input.conversationId ?? null,
    scheduled_send_at: input.scheduledSendAt?.toISOString() ?? null,
    created_by: input.createdBy,
  };
  const { data, error } = await admin
    .from("email_messages")
    .insert(insert as never)
    .select("id")
    .single();
  if (error) throw error;
  return { id: (data as { id: string }).id };
}

/** Mark a pending_approval row as approved by `actorId` and queue it for send. */
export async function approveAndQueue(id: string, actorId: string): Promise<void> {
  const admin = createAdminClient();
  const update: EmailMessageUpdate = {
    status: "queued",
    approved_by: actorId,
    approved_at: new Date().toISOString(),
  };
  const { error } = await admin
    .from("email_messages")
    .update(update as never)
    .eq("id", id)
    .eq("status", "pending_approval");
  if (error) throw error;
}

/** Cancel a queued or pending_approval message — sets it to failed with a reason. */
export async function cancel(id: string, reason: string): Promise<void> {
  const admin = createAdminClient();
  const update: EmailMessageUpdate = {
    status: "failed",
    error: `Đã hủy bởi HR: ${reason}`.slice(0, 2000),
    next_retry_at: null,
  };
  const { error } = await admin
    .from("email_messages")
    .update(update as never)
    .eq("id", id)
    .in("status", ["queued", "pending_approval"]);
  if (error) throw error;
}

export type EmailDetailRow = EmailMessageRow & {
  candidate?: { id: string; full_name: string; email: string | null } | null;
  job?: { id: string; title: string } | null;
};

/** Fetch one row plus joined candidate/job info for the detail panel + queue table. */
export async function getEmailDetail(id: string): Promise<EmailDetailRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_messages")
    .select("*, candidate:candidates(id, full_name, email), job:jobs(id, title)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as EmailDetailRow | null) ?? null;
}

/** Fetch the full email thread for a candidate, newest first (for the candidate-detail email tab). */
export async function listCandidateEmails(candidateId: string): Promise<EmailMessageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_messages")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EmailMessageRow[];
}

export interface QueuePageFilter {
  status?: EmailStatus | null;
  templateCode?: string | null;
  candidateId?: string | null;
}

/** Read for the HR queue page. RLS-aware (admin/HR see everything; manager sees own jobs). */
export async function listEmailsForQueuePage(
  filter: QueuePageFilter,
  limit = 100,
): Promise<EmailDetailRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("email_messages")
    .select("*, candidate:candidates(id, full_name, email), job:jobs(id, title)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.templateCode) q = q.eq("template_code", filter.templateCode);
  if (filter.candidateId) q = q.eq("candidate_id", filter.candidateId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EmailDetailRow[];
}
