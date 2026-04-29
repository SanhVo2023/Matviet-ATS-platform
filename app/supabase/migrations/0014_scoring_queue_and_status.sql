-- Migration 0014 — Async scoring queue + screening status flags (Group 4)
--
-- Adds:
--   * ai_screening_status enum + denormalized columns on candidates
--   * scoring_job_status enum + scoring_queue table for the async pipeline
--   * pick_scoring_job() — atomic dequeue used by the score-candidate Edge Function
--   * reaggregate_job_scores() — instant re-aggregation after weight changes (no Gemini calls)
--   * Updates bump_candidate_score trigger to also stamp ai_screening_status='success'

-- =================== Enums ===================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'ai_screening_status') then
    create type ai_screening_status as enum ('pending', 'success', 'failed');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'scoring_job_status') then
    create type scoring_job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
  end if;
end $$;

-- =================== candidates: status flags ===================

alter table public.candidates
  add column if not exists ai_screening_status ai_screening_status not null default 'pending',
  add column if not exists ai_screening_error text,
  add column if not exists ai_scored_at timestamptz;

create index if not exists idx_candidates_screening_status
  on public.candidates(ai_screening_status)
  where ai_screening_status in ('pending', 'failed');

-- Backfill: success for already-scored candidates (G3 may have created some via dev seeds)
update public.candidates
set ai_screening_status = 'success',
    ai_scored_at = coalesce(ai_scored_at, updated_at)
where ai_score is not null
  and ai_screening_status = 'pending';

-- =================== scoring_queue ===================

create table if not exists public.scoring_queue (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  status scoring_job_status not null default 'queued',
  attempts int not null default 0,
  last_error text,
  enqueued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  next_retry_at timestamptz,
  triggered_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_scoring_queue_pending
  on public.scoring_queue(enqueued_at)
  where status = 'queued';

create index if not exists idx_scoring_queue_retry
  on public.scoring_queue(next_retry_at)
  where status = 'failed' and next_retry_at is not null;

create index if not exists idx_scoring_queue_candidate
  on public.scoring_queue(candidate_id, enqueued_at desc);

alter table public.scoring_queue enable row level security;

drop policy if exists scoring_queue_hr_select on public.scoring_queue;
create policy scoring_queue_hr_select on public.scoring_queue for select
  using (public.is_hr());

drop policy if exists scoring_queue_hr_insert on public.scoring_queue;
create policy scoring_queue_hr_insert on public.scoring_queue for insert
  with check (public.is_hr());

drop policy if exists scoring_queue_hr_update on public.scoring_queue;
create policy scoring_queue_hr_update on public.scoring_queue for update
  using (public.is_hr()) with check (public.is_hr());

-- =================== Helper: pick_scoring_job (atomic dequeue) ===================
-- Used by the score-candidate Edge Function (service role bypasses RLS).
-- Standard Postgres queue dequeue: SELECT FOR UPDATE SKIP LOCKED in a subquery,
-- then UPDATE the chosen row to 'running' and RETURN it. Concurrent workers
-- never collide on the same row.

create or replace function public.pick_scoring_job()
returns public.scoring_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.scoring_queue;
begin
  update public.scoring_queue
  set status = 'running',
      started_at = now(),
      attempts = scoring_queue.attempts + 1
  where id = (
    select id from public.scoring_queue
    where status = 'queued'
       or (status = 'failed' and next_retry_at is not null and next_retry_at <= now())
    order by enqueued_at asc
    for update skip locked
    limit 1
  )
  returning * into r;

  if not found then
    return null;
  end if;
  return r;
end $$;

revoke execute on function public.pick_scoring_job() from public, anon, authenticated;
-- service role retains EXECUTE (default for the function owner)

-- =================== Helper: reaggregate_job_scores ===================
-- Called when a job's weights change. For each non-archived candidate of the
-- job that has at least one screening, recompute the weighted total from the
-- LATEST screening's `criteria` jsonb using the new weights — pure SQL, no
-- Gemini call. Returns the count of rows updated.

create or replace function public.reaggregate_job_scores(_job_id uuid, _new_weights jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int := 0;
  rec record;
  weighted numeric;
begin
  for rec in
    select distinct on (c.id)
      c.id as candidate_id,
      ais.criteria
    from public.candidates c
    join public.ai_screenings ais on ais.candidate_id = c.id
    where c.job_id = _job_id and c.is_archived = false
    order by c.id, ais.created_at desc
  loop
    weighted :=
      coalesce((rec.criteria->'industry_fit'->>'score')::numeric        * coalesce((_new_weights->>'industry_fit')::numeric, 0), 0)
      + coalesce((rec.criteria->'professional_skills'->>'score')::numeric * coalesce((_new_weights->>'professional_skills')::numeric, 0), 0)
      + coalesce((rec.criteria->'work_experience'->>'score')::numeric    * coalesce((_new_weights->>'work_experience')::numeric, 0), 0)
      + coalesce((rec.criteria->'years_experience'->>'score')::numeric   * coalesce((_new_weights->>'years_experience')::numeric, 0), 0)
      + coalesce((rec.criteria->'education'->>'score')::numeric          * coalesce((_new_weights->>'education')::numeric, 0), 0)
      + coalesce((rec.criteria->'location'->>'score')::numeric           * coalesce((_new_weights->>'location')::numeric, 0), 0);

    update public.candidates
    set ai_score = round(weighted, 2),
        updated_at = now()
    where id = rec.candidate_id;

    updated_count := updated_count + 1;
  end loop;

  return updated_count;
end $$;

revoke execute on function public.reaggregate_job_scores(uuid, jsonb) from public, anon;
-- HR / admin can call via authenticated RPC if ever needed; service role obviously can.
grant execute on function public.reaggregate_job_scores(uuid, jsonb) to authenticated;

-- =================== Update bump_candidate_score: also stamp status ===================
-- Successful screenings flip ai_screening_status to 'success' and set ai_scored_at.
-- Failures don't write ai_screenings rows — the Edge Function updates candidates directly.

create or replace function public.bump_candidate_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.error is null then
    update public.candidates
    set ai_score = new.total,
        ai_breakdown = new.criteria,
        ai_screening_status = 'success',
        ai_screening_error = null,
        ai_scored_at = new.created_at,
        updated_at = now()
    where id = new.candidate_id;
  end if;
  return new;
end $$;
-- Trigger trg_screening_score_bump from migration 0007 still attached to ai_screenings AFTER INSERT.
