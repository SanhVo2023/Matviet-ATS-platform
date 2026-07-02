import "server-only";
import { and, asc, desc, eq, inArray, isNull, lte, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, email_messages, jobs } from "@/db/schema";
import type { Database, TablesUpdate } from "@/types/db";

type EmailMessageRow = Database["public"]["Tables"]["email_messages"]["Row"];
type EmailMessageUpdate = TablesUpdate<"email_messages">;
export type EmailStatus = Database["public"]["Enums"]["email_status"];

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

const drainableColumns = {
  id: email_messages.id,
  candidate_id: email_messages.candidate_id,
  job_id: email_messages.job_id,
  interview_id: email_messages.interview_id,
  template_code: email_messages.template_code,
  to_emails: email_messages.to_emails,
  cc_emails: email_messages.cc_emails,
  subject: email_messages.subject,
  body_html: email_messages.body_html,
  retry_count: email_messages.retry_count,
  in_reply_to: email_messages.in_reply_to,
  conversation_id: email_messages.conversation_id,
} as const;

/**
 * Pick up to `limit` queued messages whose retry-after has elapsed.
 * Ordered FIFO so the oldest queued email goes first.
 */
export async function listDrainableEmails(limit: number): Promise<DrainableEmail[]> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  return db
    .select(drainableColumns)
    .from(email_messages)
    .where(
      and(
        eq(email_messages.status, "queued"),
        or(isNull(email_messages.next_retry_at), lte(email_messages.next_retry_at, nowIso)),
      ),
    )
    .orderBy(asc(email_messages.created_at))
    .limit(limit);
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
  const db = await getDb();
  const update: EmailMessageUpdate = {
    status: "sent",
    sent_at: new Date().toISOString(),
    error: null,
    next_retry_at: null,
    graph_message_id: options.graphMessageId ?? null,
    // undefined → drizzle skips the column (same "leave untouched" semantics as before)
    conversation_id: options.conversationId ?? undefined,
  };
  await db.update(email_messages).set(update).where(eq(email_messages.id, id));
}

/** Move to status='failed' with the rendered error so HR can read it on the queue page. */
export async function markFailed(id: string, errorMessage: string): Promise<void> {
  const db = await getDb();
  await db
    .update(email_messages)
    .set({ status: "failed", error: errorMessage.slice(0, 2000), next_retry_at: null })
    .where(eq(email_messages.id, id));
}

/** Keep status='queued' but bump retry_count + push next_retry_at into the future. */
export async function bumpRetry(
  id: string,
  retryCount: number,
  nextRetryAt: Date,
  errorMessage: string,
): Promise<void> {
  const db = await getDb();
  await db
    .update(email_messages)
    .set({
      retry_count: retryCount,
      next_retry_at: nextRetryAt.toISOString(),
      error: errorMessage.slice(0, 2000),
    })
    .where(eq(email_messages.id, id));
}

/** Reset retry_count + next_retry_at + error on a manual "Thử lại" click from HR. */
export async function resetForManualRetry(id: string): Promise<void> {
  const db = await getDb();
  await db
    .update(email_messages)
    .set({ status: "queued", retry_count: 0, next_retry_at: null, error: null })
    .where(eq(email_messages.id, id));
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
  const db = await getDb();
  const inserted = await db
    .insert(email_messages)
    .values({
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
    })
    .returning({ id: email_messages.id });
  const id = inserted[0]?.id;
  if (!id) throw new Error("Không thể tạo email");
  return { id };
}

/** Mark a pending_approval row as approved by `actorId` and queue it for send. */
export async function approveAndQueue(id: string, actorId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(email_messages)
    .set({ status: "queued", approved_by: actorId, approved_at: new Date().toISOString() })
    .where(and(eq(email_messages.id, id), eq(email_messages.status, "pending_approval")));
}

/** Cancel a queued or pending_approval message — sets it to failed with a reason. */
export async function cancel(id: string, reason: string): Promise<void> {
  const db = await getDb();
  await db
    .update(email_messages)
    .set({
      status: "failed",
      error: `Đã hủy bởi HR: ${reason}`.slice(0, 2000),
      next_retry_at: null,
    })
    .where(
      and(
        eq(email_messages.id, id),
        inArray(email_messages.status, ["queued", "pending_approval"]),
      ),
    );
}

export type EmailDetailRow = EmailMessageRow & {
  candidate?: { id: string; full_name: string; email: string | null } | null;
  job?: { id: string; title: string } | null;
};

/** Shared join + row-shaping for the detail panel and queue table reads. */
async function selectDetailRows(where: SQL | undefined, limit?: number): Promise<EmailDetailRow[]> {
  const db = await getDb();
  let q = db
    .select({
      email: email_messages,
      candidate_id: candidates.id,
      candidate_full_name: candidates.full_name,
      candidate_email: candidates.email,
      join_job_id: jobs.id,
      job_title: jobs.title,
    })
    .from(email_messages)
    .leftJoin(candidates, eq(email_messages.candidate_id, candidates.id))
    .leftJoin(jobs, eq(email_messages.job_id, jobs.id))
    .where(where)
    .orderBy(desc(email_messages.created_at))
    .$dynamic();
  if (limit != null) q = q.limit(limit);
  const rows = await q;
  return rows.map((r) => ({
    ...r.email,
    candidate: r.candidate_id
      ? {
          id: r.candidate_id,
          full_name: r.candidate_full_name ?? "",
          email: r.candidate_email ?? null,
        }
      : null,
    job: r.join_job_id ? { id: r.join_job_id, title: r.job_title ?? "" } : null,
  }));
}

/** Fetch one row plus joined candidate/job info for the detail panel + queue table. */
export async function getEmailDetail(id: string): Promise<EmailDetailRow | null> {
  const rows = await selectDetailRows(eq(email_messages.id, id), 1);
  return rows[0] ?? null;
}

/** Fetch the full email thread for a candidate, newest first (for the candidate-detail email tab). */
export async function listCandidateEmails(candidateId: string): Promise<EmailMessageRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(email_messages)
    .where(eq(email_messages.candidate_id, candidateId))
    .orderBy(desc(email_messages.created_at));
}

export interface QueuePageFilter {
  status?: EmailStatus | null;
  templateCode?: string | null;
  candidateId?: string | null;
}

/** Read for the HR queue page. Authorization is enforced by the calling page's requireRole guard. */
export async function listEmailsForQueuePage(
  filter: QueuePageFilter,
  limit = 100,
): Promise<EmailDetailRow[]> {
  const conditions: SQL[] = [];
  if (filter.status) conditions.push(eq(email_messages.status, filter.status));
  if (filter.templateCode) conditions.push(eq(email_messages.template_code, filter.templateCode));
  if (filter.candidateId) conditions.push(eq(email_messages.candidate_id, filter.candidateId));
  return selectDetailRows(conditions.length ? and(...conditions) : undefined, limit);
}
