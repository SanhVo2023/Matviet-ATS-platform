# 0011 — Authorization moves from Postgres RLS to the service layer

**Date:** 2026-07-02
**Status:** Accepted
**Decision-makers:** Claude (under Sanh's blanket pivot directive)

## Context

D1 has no row-level security and a single database principal (the Worker binding). The Supabase design used RLS policies (migrations 0008/0011–0016) as the primary authorization layer, with `requireRole()` guards as defense-in-depth. G8 already inverted this in practice: approval-inbox scoping was implemented in the repository because the join was awkward through RLS.

## Decision

**All authorization is enforced in the application:**

1. **Route/action guards** — every server action, API route, and page calls `requireRole([...])` first. This was already universal.
2. **Repository scoping** — queries that must be role-filtered (approval inbox, manager's assigned jobs) take the caller's profile and scope in SQL, following the G8 pattern.
3. **No ambient client** — there is exactly one DB accessor (`getDb()`); the old anon/admin client split disappears. The admin-client workarounds scattered through services (used to bypass RLS) simplify to plain queries.
4. **Public surfaces stay token-gated** — `/test/[token]` (assessment submission) authenticates by single-use token exactly as before; `/api/*/drain` authenticates by `CRON_SECRET` bearer.

## Consequences

- **Pro:** one authorization model instead of two half-models; the RLS-vs-repository split (and its G4 outage: migration 0013 revoking helper EXECUTE broke every SELECT) can't recur; queries get simpler and testable.
- **Con:** a forgotten `requireRole()` is no longer caught by a second net. Mitigations: (a) every route file starts with a guard by convention, (b) `/security-review` skill runs on any PR touching auth or repositories, (c) Playwright smoke tests assert 401/403 on guard routes as part of Group 11.
- SQL injection surface unchanged: Drizzle parameterizes everything; raw SQL requires prepared statements with `bind()` by convention.
