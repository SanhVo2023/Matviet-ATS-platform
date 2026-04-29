-- Migration 0018 — Reports + analytics infrastructure (Group 10)
--
-- Adds:
--   * Compound + simple indexes for date-range + job/source filters
--   * View funnel_stats — per-job + role_family + month, count of candidates
--     who reached each pipeline_stage (built on stage_history so a candidate
--     who reached `hired` also counts at every prior stage they passed)
--   * View time_to_hire_stats — for each hired candidate, the days from
--     creation to `hired`, grouped by job + role_family + month
--   * Function report_score_distribution(_job_id, _from, _to) — bucketed AI
--     score histogram (0-9, 10-19, ... 90-100) honoring filters
--
-- All views and the function use security_invoker = on (Postgres 15+),
-- meaning they respect the caller's RLS on underlying tables. HR/admin see
-- everything; hiring_managers only see candidates of their assigned jobs.

-- =============== Indexes for date-range + filter queries ===============

create index if not exists idx_candidates_created_at
  on public.candidates(created_at);

create index if not exists idx_candidates_job_created
  on public.candidates(job_id, created_at);

create index if not exists idx_candidates_source_created
  on public.candidates(source, created_at);

create index if not exists idx_approvals_decided_at
  on public.approvals(decided_at)
  where decided_at is not null;

create index if not exists idx_stage_history_to_stage_at
  on public.stage_history(to_stage, at);

-- =============== View: funnel_stats ===============
-- Per job + role_family + month bucket, count of distinct candidates that
-- reached each stage. A candidate who hired at month M counts at every
-- to_stage they passed through; the report UI subtotals the funnel.

create or replace view public.funnel_stats
with (security_invoker = on)
as
select
  c.job_id,
  j.role_family,
  date_trunc('month', sh.at) as month_bucket,
  sh.to_stage as stage,
  count(distinct sh.candidate_id)::int as candidate_count
from public.stage_history sh
join public.candidates c on c.id = sh.candidate_id
join public.jobs j on j.id = c.job_id
where c.is_archived = false
group by c.job_id, j.role_family, date_trunc('month', sh.at), sh.to_stage;

-- =============== View: time_to_hire_stats ===============
-- For every candidate that has a `to_stage='hired'` row in stage_history,
-- compute days between their first stage_history entry and the hired entry.
-- Grouped by job + role_family + hire month. UI computes median / p90.

create or replace view public.time_to_hire_stats
with (security_invoker = on)
as
with started as (
  select candidate_id, min(at) as started_at
  from public.stage_history
  group by candidate_id
),
hired as (
  select candidate_id, min(at) as hired_at
  from public.stage_history
  where to_stage = 'hired'
  group by candidate_id
)
select
  h.candidate_id,
  c.job_id,
  j.role_family,
  date_trunc('month', h.hired_at) as month_bucket,
  -- Use seconds-of-epoch / 86400 so we get a fractional day count
  (extract(epoch from (h.hired_at - s.started_at)) / 86400.0)::numeric as days_to_hire,
  s.started_at,
  h.hired_at
from hired h
join started s on s.candidate_id = h.candidate_id
join public.candidates c on c.id = h.candidate_id
join public.jobs j on j.id = c.job_id
where c.is_archived = false;

-- =============== Function: report_score_distribution ===============
-- Returns 10-wide score buckets (0-9, 10-19, ..., 90-99, plus a "100" row
-- if any candidate hits the perfect score). Honors optional job_id and
-- date range filters. SECURITY INVOKER so RLS applies for hiring_managers.

create or replace function public.report_score_distribution(
  _job_id uuid default null,
  _from timestamptz default null,
  _to timestamptz default null
)
returns table(bucket_lower int, candidate_count int)
language sql
stable
security invoker
set search_path = public
as $$
  select
    least(90, (floor(c.ai_score / 10) * 10)::int) as bucket_lower,
    count(*)::int as candidate_count
  from public.candidates c
  where c.is_archived = false
    and c.ai_score is not null
    and (_job_id is null or c.job_id = _job_id)
    and (_from is null or c.created_at >= _from)
    and (_to is null or c.created_at <= _to)
  group by least(90, (floor(c.ai_score / 10) * 10)::int)
  order by 1;
$$;

-- EXECUTE for authenticated by default (function is owned by postgres + has
-- public ACL since we didn't revoke). Explicit GRANT just to be safe.
grant execute on function public.report_score_distribution(uuid, timestamptz, timestamptz)
  to authenticated;
