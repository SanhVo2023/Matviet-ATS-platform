-- Migration 0012 — Revoke EXECUTE FROM PUBLIC on internal SECURITY DEFINER helpers
-- The previous migration revoked from anon/authenticated explicitly, but the default
-- `EXECUTE TO PUBLIC` grant still exposes them via /rest/v1/rpc/*. PUBLIC is a pseudo-role
-- that grants to all roles including anon. Revoking from PUBLIC removes the REST exposure.
-- These functions are only called from triggers and RLS policies, both of which evaluate
-- with the function owner's privileges via SECURITY DEFINER — no caller grant needed.

revoke execute on function public.bump_candidate_score()       from public;
revoke execute on function public.log_stage_change()           from public;
revoke execute on function public.handle_new_user()            from public;
revoke execute on function public.current_dept()               from public;
revoke execute on function public.current_role_v()             from public;
revoke execute on function public.is_manager_for_job(uuid)     from public;
revoke execute on function public.is_admin()                   from public;
revoke execute on function public.is_hr()                      from public;
revoke execute on function public.set_updated_at()             from public;
