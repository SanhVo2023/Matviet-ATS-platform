-- Migration 0004 — Interviews, attendees, evaluations

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_min int not null default 60,
  type interview_type not null default 'in_person',
  location_or_link text,
  graph_event_id text,
  teams_link text,
  status interview_status not null default 'scheduled',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_interviews_candidate on public.interviews(candidate_id);
create index if not exists idx_interviews_scheduled on public.interviews(scheduled_at);
create index if not exists idx_interviews_status on public.interviews(status);

create table if not exists public.interview_attendees (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role interviewer_role not null default 'interviewer',
  created_at timestamptz not null default now(),
  unique (interview_id, user_id)
);

create index if not exists idx_attendees_user on public.interview_attendees(user_id);

create table if not exists public.interview_evaluations (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  evaluator_user_id uuid not null references public.profiles(id) on delete cascade,
  scores jsonb not null,           -- 6 sliders 0-100
  strengths text,
  concerns text,
  proposed_salary numeric,
  recommendation recommendation,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interview_id, evaluator_user_id)
);

create index if not exists idx_evals_interview on public.interview_evaluations(interview_id);
