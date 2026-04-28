-- Migration 0001 — Extensions + Enums
-- Mắt Việt HR foundational types

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ============== ENUMS ==============

do $$ begin
  create type user_role as enum ('admin', 'hr', 'hiring_manager', 'bod', 'tap_doan');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('draft', 'open', 'paused', 'closed', 'filled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type flow_type as enum ('staff', 'management');
exception when duplicate_object then null; end $$;

do $$ begin
  create type candidate_source as enum (
    'manual_upload', 'email_inbox', 'csv_import', 'topcv_api', 'referral'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type pipeline_stage as enum (
    'new', 'screening', 'screened',
    'interview_scheduled', 'interviewed',
    'test_sent', 'test_done',
    'recommended', 'salary_deal', 'bod_review', 'tap_doan_review',
    'offer_sent', 'offer_accepted',
    'hired', 'rejected', 'withdrew'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type interview_type as enum ('in_person', 'phone', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type interview_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type interviewer_role as enum ('interviewer', 'observer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type recommendation as enum ('strong_yes', 'yes', 'maybe', 'no');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_step_kind as enum (
    'hr_recommend', 'manager_recommend', 'salary_deal', 'bod', 'tap_doan'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type email_direction as enum ('outbound', 'inbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type email_status as enum (
    'queued', 'pending_approval', 'sent', 'delivered', 'failed', 'received'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type role_family as enum ('sales', 'optician', 'office', 'manager', 'custom');
exception when duplicate_object then null; end $$;
