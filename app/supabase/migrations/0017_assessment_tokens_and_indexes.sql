-- Migration 0017 — Public assessment submission tokens (Group 9)
--
-- Adds:
--   * assessment_invite_tokens table — short-lived (48h) tokens that let an
--     unauthenticated candidate upload a single answer file via /test/[token].
--   * Indexes for quick token lookup + active-token sweeps.
--   * Unique index on (candidate_id, assessment_id) so a candidate can only
--     have one submission per assessment.
--   * Active-assessment index on assessments(job_id) for the candidate detail
--     page lookup.
--
-- Storage buckets `assessments` and `submissions` already created in 0009.
-- The /api/test/submit route uses the service-role admin client to bypass RLS
-- when validating tokens + writing submissions, so this table has RLS enabled
-- with NO policies (deny-all to authenticated; service role bypasses).

create table if not exists public.assessment_invite_tokens (
  token text primary key,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  submission_id uuid references public.assessment_submissions(id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_assessment_tokens_candidate
  on public.assessment_invite_tokens(candidate_id);

create index if not exists idx_assessment_tokens_active
  on public.assessment_invite_tokens(expires_at)
  where used_at is null;

alter table public.assessment_invite_tokens enable row level security;
-- intentionally no policies — service role bypasses RLS; authenticated users
-- cannot directly read tokens (HR sees them via the candidate detail page,
-- which queries through the assessments service module using admin client).

-- =============== Indexes on existing assessment tables (Group 9 hot paths) ===============

create unique index if not exists uq_assessment_subs_candidate_assessment
  on public.assessment_submissions(candidate_id, assessment_id);

create index if not exists idx_assessments_job_active
  on public.assessments(job_id) where is_active;
