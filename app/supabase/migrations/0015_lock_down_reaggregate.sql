-- Migration 0015 — Lock down reaggregate_job_scores to service role only
--
-- Advisor 0029 (authenticated_security_definer_function_executable) flagged
-- reaggregate_job_scores after 0014 because we granted EXECUTE to authenticated.
-- The function is only ever called from Server Actions that use the admin
-- (service-role) client, so revoke from authenticated to close the surface.

revoke execute on function public.reaggregate_job_scores(uuid, jsonb) from authenticated;
-- service role retains EXECUTE (default for the function owner)
