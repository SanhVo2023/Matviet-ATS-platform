-- Migration 0005 — Assessments + approval flow

-- =============== assessments ===============
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  test_storage_path text,
  original_name text,
  instructions text,
  time_limit_min int,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  submission_storage_path text,
  submitted_at timestamptz,
  email_message_id uuid,    -- soft FK to email_messages (added later)
  score numeric,
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subs_candidate on public.assessment_submissions(candidate_id);

-- =============== approvals ===============
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  step_index int not null,
  step_kind approval_step_kind not null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  status approval_status not null default 'pending',
  notes text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_approvals_candidate on public.approvals(candidate_id, step_index);
create index if not exists idx_approvals_status on public.approvals(status);
