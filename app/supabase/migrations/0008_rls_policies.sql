-- Migration 0008 — Row-Level Security policies
-- Pattern:
--   admin              -> all rows
--   hr                 -> all rows (single-tenant org)
--   hiring_manager     -> only own department + assigned jobs (cascading to candidates/interviews)
--   bod / tap_doan     -> read on management-flow approvals + linked candidates
-- All tables have RLS enabled; service role bypasses RLS.

-- =================== Helper functions ===================
create or replace function public.current_role_v()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_dept()
returns uuid
language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(public.current_role_v() = 'admin', false)
$$;

create or replace function public.is_hr()
returns boolean language sql stable as $$
  select coalesce(public.current_role_v() in ('admin','hr'), false)
$$;

create or replace function public.is_manager_for_job(_job_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.jobs j
    left join public.job_assignments ja on ja.job_id = j.id
    where j.id = _job_id
      and (
        ja.manager_user_id = auth.uid()
        or j.department_id = public.current_dept()
      )
  )
$$;

-- =================== Enable RLS ===================
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.jobs enable row level security;
alter table public.job_assignments enable row level security;
alter table public.weight_templates enable row level security;
alter table public.cv_files enable row level security;
alter table public.candidates enable row level security;
alter table public.ai_screenings enable row level security;
alter table public.stage_history enable row level security;
alter table public.referrals enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_attendees enable row level security;
alter table public.interview_evaluations enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_submissions enable row level security;
alter table public.approvals enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_messages enable row level security;
alter table public.inbox_attachments enable row level security;
alter table public.audit_log enable row level security;

-- =================== profiles ===================
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (auth.uid() = id or public.is_hr());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- =================== departments ===================
drop policy if exists departments_read on public.departments;
create policy departments_read on public.departments for select using (auth.uid() is not null);

drop policy if exists departments_admin on public.departments;
create policy departments_admin on public.departments for all
  using (public.is_admin()) with check (public.is_admin());

-- =================== weight_templates ===================
drop policy if exists wt_read on public.weight_templates;
create policy wt_read on public.weight_templates for select using (auth.uid() is not null);

drop policy if exists wt_hr_write on public.weight_templates;
create policy wt_hr_write on public.weight_templates for all
  using (public.is_hr()) with check (public.is_hr());

-- =================== jobs ===================
drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs for select using (
  public.is_hr()
  or department_id = public.current_dept()
  or exists (select 1 from public.job_assignments ja where ja.job_id = jobs.id and ja.manager_user_id = auth.uid())
  or public.current_role_v() in ('bod','tap_doan')
);

drop policy if exists jobs_hr_write on public.jobs;
create policy jobs_hr_write on public.jobs for all
  using (public.is_hr()) with check (public.is_hr());

-- =================== job_assignments ===================
drop policy if exists ja_select on public.job_assignments;
create policy ja_select on public.job_assignments for select using (
  public.is_hr() or manager_user_id = auth.uid()
);

drop policy if exists ja_hr_write on public.job_assignments;
create policy ja_hr_write on public.job_assignments for all
  using (public.is_hr()) with check (public.is_hr());

-- =================== cv_files ===================
drop policy if exists cv_select on public.cv_files;
create policy cv_select on public.cv_files for select using (
  public.is_hr() or exists (
    select 1 from public.candidates c
    join public.jobs j on j.id = c.job_id
    where c.cv_file_id = cv_files.id
      and (j.department_id = public.current_dept()
           or exists (select 1 from public.job_assignments ja where ja.job_id = j.id and ja.manager_user_id = auth.uid()))
  )
);

drop policy if exists cv_hr_write on public.cv_files;
create policy cv_hr_write on public.cv_files for all
  using (public.is_hr()) with check (public.is_hr());

-- =================== candidates ===================
drop policy if exists candidates_select on public.candidates;
create policy candidates_select on public.candidates for select using (
  public.is_hr()
  or public.is_manager_for_job(job_id)
);

drop policy if exists candidates_hr_write on public.candidates;
create policy candidates_hr_write on public.candidates for all
  using (public.is_hr()) with check (public.is_hr());

drop policy if exists candidates_manager_update on public.candidates;
create policy candidates_manager_update on public.candidates for update using (
  public.is_manager_for_job(job_id)
) with check (public.is_manager_for_job(job_id));

-- =================== ai_screenings ===================
drop policy if exists scr_read on public.ai_screenings;
create policy scr_read on public.ai_screenings for select using (
  public.is_hr() or exists (
    select 1 from public.candidates c
    where c.id = ai_screenings.candidate_id
      and public.is_manager_for_job(c.job_id)
  )
);

drop policy if exists scr_hr_write on public.ai_screenings;
create policy scr_hr_write on public.ai_screenings for all
  using (public.is_hr()) with check (public.is_hr());

-- =================== stage_history ===================
drop policy if exists stage_read on public.stage_history;
create policy stage_read on public.stage_history for select using (
  public.is_hr() or exists (
    select 1 from public.candidates c
    where c.id = stage_history.candidate_id and public.is_manager_for_job(c.job_id)
  )
);

drop policy if exists stage_hr_write on public.stage_history;
create policy stage_hr_write on public.stage_history for all
  using (public.is_hr()) with check (public.is_hr());

-- =================== referrals ===================
drop policy if exists ref_read on public.referrals;
create policy ref_read on public.referrals for select using (
  public.is_hr() or referrer_user_id = auth.uid()
);

drop policy if exists ref_insert on public.referrals;
create policy ref_insert on public.referrals for insert
  with check (auth.uid() = referrer_user_id or public.is_hr());

-- =================== interviews + attendees + evaluations ===================
drop policy if exists iv_read on public.interviews;
create policy iv_read on public.interviews for select using (
  public.is_hr()
  or public.is_manager_for_job(job_id)
  or exists (select 1 from public.interview_attendees a where a.interview_id = interviews.id and a.user_id = auth.uid())
);

drop policy if exists iv_hr_write on public.interviews;
create policy iv_hr_write on public.interviews for all
  using (public.is_hr()) with check (public.is_hr());

drop policy if exists ia_read on public.interview_attendees;
create policy ia_read on public.interview_attendees for select using (
  public.is_hr() or user_id = auth.uid()
);

drop policy if exists ia_hr_write on public.interview_attendees;
create policy ia_hr_write on public.interview_attendees for all
  using (public.is_hr()) with check (public.is_hr());

drop policy if exists ev_read on public.interview_evaluations;
create policy ev_read on public.interview_evaluations for select using (
  public.is_hr()
  or evaluator_user_id = auth.uid()
  or exists (
    select 1 from public.interviews iv
    where iv.id = interview_evaluations.interview_id
      and public.is_manager_for_job(iv.job_id)
  )
);

drop policy if exists ev_self_write on public.interview_evaluations;
create policy ev_self_write on public.interview_evaluations for all
  using (evaluator_user_id = auth.uid() or public.is_hr())
  with check (evaluator_user_id = auth.uid() or public.is_hr());

-- =================== assessments ===================
drop policy if exists as_read on public.assessments;
create policy as_read on public.assessments for select using (
  public.is_hr() or public.is_manager_for_job(job_id)
);

drop policy if exists as_hr_write on public.assessments;
create policy as_hr_write on public.assessments for all
  using (public.is_hr()) with check (public.is_hr());

drop policy if exists subs_read on public.assessment_submissions;
create policy subs_read on public.assessment_submissions for select using (
  public.is_hr() or exists (
    select 1 from public.candidates c
    where c.id = assessment_submissions.candidate_id and public.is_manager_for_job(c.job_id)
  )
);

drop policy if exists subs_hr_write on public.assessment_submissions;
create policy subs_hr_write on public.assessment_submissions for all
  using (public.is_hr()) with check (public.is_hr());

-- =================== approvals ===================
drop policy if exists ap_read on public.approvals;
create policy ap_read on public.approvals for select using (
  public.is_hr()
  or actor_user_id = auth.uid()
  or public.current_role_v() in ('bod','tap_doan')
  or exists (
    select 1 from public.candidates c
    where c.id = approvals.candidate_id and public.is_manager_for_job(c.job_id)
  )
);

drop policy if exists ap_actor_update on public.approvals;
create policy ap_actor_update on public.approvals for update using (
  actor_user_id = auth.uid() or public.is_hr()
) with check (
  actor_user_id = auth.uid() or public.is_hr()
);

drop policy if exists ap_hr_write on public.approvals;
create policy ap_hr_write on public.approvals for all
  using (public.is_hr()) with check (public.is_hr());

-- =================== emails ===================
drop policy if exists et_read on public.email_templates;
create policy et_read on public.email_templates for select using (auth.uid() is not null);

drop policy if exists et_hr_write on public.email_templates;
create policy et_hr_write on public.email_templates for all
  using (public.is_hr()) with check (public.is_hr());

drop policy if exists em_read on public.email_messages;
create policy em_read on public.email_messages for select using (
  public.is_hr() or exists (
    select 1 from public.candidates c
    where c.id = email_messages.candidate_id and public.is_manager_for_job(c.job_id)
  )
);

drop policy if exists em_hr_write on public.email_messages;
create policy em_hr_write on public.email_messages for all
  using (public.is_hr()) with check (public.is_hr());

drop policy if exists ia2_read on public.inbox_attachments;
create policy ia2_read on public.inbox_attachments for select using (
  public.is_hr()
);

drop policy if exists ia2_hr_write on public.inbox_attachments;
create policy ia2_hr_write on public.inbox_attachments for all
  using (public.is_hr()) with check (public.is_hr());

-- =================== audit_log ===================
drop policy if exists audit_admin_read on public.audit_log;
create policy audit_admin_read on public.audit_log for select
  using (public.is_admin() or public.is_hr());

-- service role only inserts
drop policy if exists audit_no_insert on public.audit_log;
create policy audit_no_insert on public.audit_log for insert
  with check (public.is_hr());
