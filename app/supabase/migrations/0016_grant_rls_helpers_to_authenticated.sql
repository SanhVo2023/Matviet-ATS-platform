-- Migration 0016 — Restore EXECUTE on RLS helpers to authenticated
--
-- 0013 was wrong: even SECURITY DEFINER functions need the CALLER to have
-- EXECUTE permission to be invoked. Postgres RLS policies are evaluated in
-- the calling user's security context, so when an authenticated user runs
-- `SELECT * FROM jobs`, the policy evaluates `current_dept()` AS the
-- authenticated user — who, after 0013, lacked EXECUTE → 42501.
--
-- Symptom (caught by Sanh in browser, 2026-04-29): every page that selects
-- jobs / candidates / interviews / approvals threw "permission denied for
-- function current_dept" because the jobs.j_select policy evaluates it.
--
-- These helpers only return data about the calling user (auth.uid())'s own
-- role + department — exposing them via /rest/v1/rpc has no real PII risk.
-- Advisor 0029 will re-flag them as "executable by authenticated"; that's
-- expected and accepted (mirrors the public_bucket_allows_listing accepted
-- WARN from 0011).
--
-- Public/anon revoke from 0012 stays in place — anonymous users still cannot
-- call these RPCs.

grant execute on function public.current_dept()              to authenticated;
grant execute on function public.current_role_v()            to authenticated;
grant execute on function public.is_manager_for_job(uuid)    to authenticated;

-- is_hr() and is_admin() weren't revoked in 0013, but they internally call
-- current_role_v() which IS executed in the caller's context (since they're
-- not SECURITY DEFINER). Make sure authenticated has EXECUTE on those too,
-- in case 0011 or 0012 stripped it indirectly.
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_hr()    to authenticated;
