-- Migration 0011 — Security hardening per Supabase advisor (post-RLS)
-- Addresses:
--   * function_search_path_mutable (5 fns)
--   * anon/authenticated_security_definer_function_executable (revokes EXECUTE from PUBLIC on internal helpers)
-- Out of scope (accepted as v1 risk, documented in build-log):
--   * extension_in_public — pg_trgm/unaccent in public; would require dropping/recreating extension; risk > reward at this stage
--   * public_bucket_allows_listing — assets bucket SELECT policy is intentional for brand assets

-- =================== Pin search_path on SECURITY DEFINER + helper functions ===================

alter function public.set_updated_at()        set search_path = public;
alter function public.log_stage_change()      set search_path = public;
alter function public.bump_candidate_score()  set search_path = public;
alter function public.is_admin()              set search_path = public;
alter function public.is_hr()                 set search_path = public;
-- current_role_v, current_dept, is_manager_for_job, handle_new_user already set search_path explicitly in 0007/0008.

-- =================== Lock down REST RPC exposure ===================
-- These helpers are called from triggers and RLS policies, NOT from client RPC.
-- Revoke EXECUTE from anon + authenticated so they don't appear under /rest/v1/rpc/*.

revoke execute on function public.bump_candidate_score()       from anon, authenticated;
revoke execute on function public.log_stage_change()           from anon, authenticated;
revoke execute on function public.handle_new_user()            from anon, authenticated;

-- These are called from RLS policies; they need to be callable by authenticated but never anon.
revoke execute on function public.current_dept()               from anon;
revoke execute on function public.current_role_v()             from anon;
revoke execute on function public.is_manager_for_job(uuid)     from anon;
revoke execute on function public.is_admin()                   from anon;
revoke execute on function public.is_hr()                      from anon;
