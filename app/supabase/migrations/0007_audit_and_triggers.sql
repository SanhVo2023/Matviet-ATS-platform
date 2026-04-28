-- Migration 0007 — Audit log + triggers (updated_at, stage_history, ai_score denorm)

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,        -- e.g. 'create','update','delete','approve','reject','send_email'
  entity text not null,        -- e.g. 'job','candidate','interview','approval'
  entity_id uuid,
  before jsonb,
  after jsonb,
  meta jsonb,
  at timestamptz not null default now()
);

create index if not exists idx_audit_entity on public.audit_log(entity, entity_id, at desc);
create index if not exists idx_audit_actor on public.audit_log(actor_user_id, at desc);

-- =================== updated_at trigger ===================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'profiles','departments','jobs','candidates','interviews','interview_evaluations',
      'assessments','assessment_submissions','approvals','email_templates','email_messages',
      'weight_templates'
    ])
  loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I', t, t);
    execute format('create trigger trg_%s_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- =================== stage history auto-insert ===================
create or replace function public.log_stage_change()
returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.stage_history (candidate_id, from_stage, to_stage, actor_user_id)
    values (new.id, null, new.current_stage, new.created_by);
  elsif (TG_OP = 'UPDATE' and old.current_stage is distinct from new.current_stage) then
    insert into public.stage_history (candidate_id, from_stage, to_stage, actor_user_id)
    values (new.id, old.current_stage, new.current_stage,
            coalesce(nullif(current_setting('request.jwt.claim.sub', true),'')::uuid, new.created_by));
  end if;
  return new;
end $$;

drop trigger if exists trg_candidates_stage on public.candidates;
create trigger trg_candidates_stage
  after insert or update of current_stage on public.candidates
  for each row execute function public.log_stage_change();

-- =================== denormalize ai_score from latest screening ===================
create or replace function public.bump_candidate_score()
returns trigger language plpgsql security definer as $$
begin
  update public.candidates
  set ai_score = new.total,
      ai_breakdown = new.criteria,
      updated_at = now()
  where id = new.candidate_id;
  return new;
end $$;

drop trigger if exists trg_screening_score_bump on public.ai_screenings;
create trigger trg_screening_score_bump
  after insert on public.ai_screenings
  for each row execute function public.bump_candidate_score();

-- =================== handle_new_user: auto-create profile ===================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'hr')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
