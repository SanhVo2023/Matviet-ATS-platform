-- Migration 0002 — Core tables: profiles, departments, jobs, job_assignments

-- =============== departments ===============
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  head_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============== profiles (extends auth.users) ===============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'hr',
  department_id uuid references public.departments(id) on delete set null,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_dept on public.profiles(department_id);

-- FK from departments.head_user_id back to profiles
do $$ begin
  alter table public.departments
    add constraint departments_head_fk
    foreign key (head_user_id) references public.profiles(id) on delete set null;
exception when duplicate_object then null; end $$;

-- =============== jobs ===============
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  title text not null,
  department_id uuid references public.departments(id) on delete set null,
  flow_type flow_type not null default 'staff',
  status job_status not null default 'draft',
  description text,
  requirements jsonb not null default '{}'::jsonb,
  weights jsonb not null default jsonb_build_object(
    'industry_fit', 0.20, 'professional_skills', 0.20, 'work_experience', 0.20,
    'years_experience', 0.15, 'education', 0.10, 'location', 0.15
  ),
  role_family role_family not null default 'office',
  salary_min numeric,
  salary_max numeric,
  location text,
  headcount int not null default 1,
  posted_at timestamptz,
  closed_at timestamptz,
  is_archived boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_jobs_dept on public.jobs(department_id);
create index if not exists idx_jobs_created_by on public.jobs(created_by);
create index if not exists idx_jobs_posted_at on public.jobs(posted_at desc);

-- =============== job_assignments (multi-manager per job) ===============
create table if not exists public.job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  manager_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (job_id, manager_user_id)
);

create index if not exists idx_assignments_manager on public.job_assignments(manager_user_id);

-- =============== weight_templates (default presets) ===============
create table if not exists public.weight_templates (
  id uuid primary key default gen_random_uuid(),
  family role_family not null unique,
  name_vi text not null,
  weights jsonb not null,
  is_default boolean not null default true,
  updated_at timestamptz not null default now()
);
