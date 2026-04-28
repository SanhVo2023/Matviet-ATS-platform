-- Migration 0003 — CV files, candidates, AI screenings, stage history

-- =============== cv_files ===============
create table if not exists public.cv_files (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  pdf_storage_path text,
  mime text not null,
  size_bytes bigint not null,
  original_name text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =============== candidates ===============
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  dob date,
  gender text,
  location text,
  source candidate_source not null default 'manual_upload',
  source_meta jsonb not null default '{}'::jsonb,
  cv_file_id uuid references public.cv_files(id) on delete set null,
  cv_text text,
  parsed jsonb,
  ai_score numeric,
  ai_breakdown jsonb,
  current_stage pipeline_stage not null default 'new',
  referrer_user_id uuid references public.profiles(id) on delete set null,
  notes text,
  is_archived boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_candidates_job on public.candidates(job_id);
create index if not exists idx_candidates_stage on public.candidates(current_stage);
create index if not exists idx_candidates_score on public.candidates(ai_score desc nulls last);
create index if not exists idx_candidates_email on public.candidates(email);
create index if not exists idx_candidates_phone on public.candidates(phone);
create index if not exists idx_candidates_search on public.candidates using gin (
  to_tsvector('simple', coalesce(full_name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(phone,''))
);

-- =============== ai_screenings (audit trail of every Gemini call) ===============
create table if not exists public.ai_screenings (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  model text not null,
  prompt_hash text,
  pass1_raw jsonb,
  pass2_raw jsonb,
  criteria jsonb not null,         -- 6 criterion scores + evidence quotes
  total numeric not null,           -- weighted total 0-100
  weights_snapshot jsonb not null,
  cost_usd numeric,
  tokens_in int,
  tokens_out int,
  duration_ms int,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_screenings_candidate on public.ai_screenings(candidate_id, created_at desc);

-- =============== stage_history ===============
create table if not exists public.stage_history (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  from_stage pipeline_stage,
  to_stage pipeline_stage not null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  notes text,
  at timestamptz not null default now()
);

create index if not exists idx_stage_history_candidate on public.stage_history(candidate_id, at desc);

-- =============== referrals ===============
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  relationship text,
  notes text,
  created_at timestamptz not null default now()
);
