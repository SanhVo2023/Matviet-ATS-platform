# 0010 — Replace Supabase Auth with better-auth on D1

**Date:** 2026-07-02
**Status:** Accepted
**Decision-makers:** Claude (under Sanh's blanket pivot directive)

## Context

ADR 0009 removes Supabase, taking Supabase Auth with it. Requirements are modest: ≤5 internal users, email/password only, admin-created accounts (no self-signup), 8h inactivity timeout, password reset by email, role-based access (admin / hr / hiring_manager / bod / tap_doan).

## Decision

**better-auth (~1.6) with the Drizzle adapter on D1.** Email/password provider only; sign-up disabled; users created by admin through the existing `/cai-dat/nguoi-dung` page; `role` stored as an additional field on the user table; session cookies with 8h sliding expiry; built-in rate limiting for login attempts; password-reset emails sent through our own MS Graph sender (`src/server/email`).

The app keeps the same auth seam: `src/lib/auth.ts` continues to export `getProfile()` / `requireRole()` with unchanged signatures, so pages and server actions do not change.

## Alternatives considered

- **Hand-rolled sessions** (password hash + session table). Smallest dependency footprint but re-implements rate limiting, reset tokens, session rotation — exactly the code you should not write yourself.
- **Lucia** — deprecated as a library (author archived it in 2024; it's now a learning resource).
- **Cloudflare Access (Zero Trust)** — would gate the whole app behind Cloudflare SSO; wrong model for role-differentiated in-app UX and the public `/test/[token]` candidate page.

## Consequences

- Supabase `auth.users` + `profiles` merge into better-auth's `user` table (+ `session`, `account`, `verification` tables) in D1.
- The `handle_new_user` Postgres trigger disappears; role assignment happens in the admin "create user" server action.
- Middleware session check switches from `@supabase/ssr` cookie parsing to better-auth's `getSession`.
- Password reset flow (`/dat-lai-mat-khau`) re-wired to better-auth's `forgetPassword` + our Graph email sender.
- Existing accounts (Sanh's admin + demo users) are re-created by seed — no credential migration (pre-launch).
