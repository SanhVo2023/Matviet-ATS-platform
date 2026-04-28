-- Migration 0013 — Belt-and-suspenders revoke on RLS helpers
-- After 0012 revoked from PUBLIC, the advisor still flagged 3 functions as authenticated-callable.
-- Supabase likely grants EXECUTE to authenticated explicitly in the API role wiring.
-- These functions are SECURITY DEFINER and called by RLS policies through the planner,
-- which evaluates them with the function owner's privileges — no caller grant needed.

revoke execute on function public.current_dept()              from authenticated;
revoke execute on function public.current_role_v()            from authenticated;
revoke execute on function public.is_manager_for_job(uuid)    from authenticated;
