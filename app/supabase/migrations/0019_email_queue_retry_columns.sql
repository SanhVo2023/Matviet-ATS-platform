-- Migration 0019 — Email queue draining: retry tracking + indexes for cron worker.
-- Companion to G6 (MS Graph send). The base columns (status, error, graph_message_id, sent_at)
-- already live in 0006_emails.sql; this migration only adds what the queue worker needs.

alter table public.email_messages
  add column if not exists retry_count int not null default 0,
  add column if not exists next_retry_at timestamptz;

comment on column public.email_messages.retry_count is
  'Number of send attempts made by the cron worker. Reset to 0 on manual retry.';
comment on column public.email_messages.next_retry_at is
  'Earliest moment the cron worker may pick this message again. null = eligible immediately.';

-- The drain query reads queued/pending_approval rows ordered by created_at; this index covers it.
create index if not exists idx_emails_queue_drain
  on public.email_messages (status, created_at)
  where status in ('queued', 'pending_approval');

-- Used by the queue page filter "đang chờ retry".
create index if not exists idx_emails_next_retry
  on public.email_messages (next_retry_at)
  where status = 'queued' and next_retry_at is not null;
