-- Migration 0006 — Email templates + messages

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_vi text not null,
  subject_vi text not null,
  body_html text not null,
  body_md text,
  variables jsonb not null default '[]'::jsonb,
  requires_approval boolean not null default false,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  template_code text references public.email_templates(code) on delete set null,
  direction email_direction not null,
  to_emails text[] not null default array[]::text[],
  cc_emails text[] not null default array[]::text[],
  from_email text,
  subject text not null,
  body_html text,
  body_text text,
  graph_message_id text,
  conversation_id text,
  in_reply_to text,
  candidate_id uuid references public.candidates(id) on delete set null,
  interview_id uuid references public.interviews(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  status email_status not null default 'queued',
  error text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  scheduled_send_at timestamptz,
  sent_at timestamptz,
  received_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_emails_candidate on public.email_messages(candidate_id, created_at desc);
create index if not exists idx_emails_conversation on public.email_messages(conversation_id);
create index if not exists idx_emails_status on public.email_messages(status);
create index if not exists idx_emails_direction on public.email_messages(direction);
create index if not exists idx_emails_pending_approval on public.email_messages(status) where status = 'pending_approval';

create table if not exists public.inbox_attachments (
  id uuid primary key default gen_random_uuid(),
  email_message_id uuid not null references public.email_messages(id) on delete cascade,
  cv_file_id uuid references public.cv_files(id) on delete set null,
  storage_path text,
  original_name text,
  mime text,
  size_bytes bigint,
  is_cv boolean not null default false,
  created_at timestamptz not null default now()
);

-- soft FK: assessment_submissions.email_message_id -> email_messages.id
do $$ begin
  alter table public.assessment_submissions
    add constraint subs_email_message_fk
    foreign key (email_message_id) references public.email_messages(id) on delete set null;
exception when duplicate_object then null; end $$;
