# 0009 — Pivot the entire platform to Cloudflare (Workers + D1 + R2)

**Date:** 2026-07-02
**Status:** Accepted
**Decision-makers:** Sanh Võ (directive) + Claude (design)

## Context

Sanh directed a full platform pivot on 2026-07-02: deploy on Cloudflare using Workers, D1, and R2, publish at `hr.matviet.com.vn`, and lay the foundation for the app to grow from an ATS into an all-in employee management system. The app is pre-launch — Supabase holds only seed/demo data, so there is **no production data migration**, only a schema + code port. This is the cheapest moment such a pivot will ever be.

Previous stack: Supabase (Auth + Postgres + Storage + RLS + Edge Functions) + Netlify hosting + Fly.io LibreOffice worker (scaffolded, never deployed) — three vendors, three dashboards, three billing relationships.

## Decision

**Single-vendor Cloudflare platform:**

| Concern | Before | After |
|---|---|---|
| Hosting/runtime | Netlify | Cloudflare Workers via `@opennextjs/cloudflare` (~1.20) |
| Database | Supabase Postgres 17 | D1 (SQLite) via Drizzle ORM |
| File storage | Supabase Storage | R2 (bucket `matviet-hr-files`), served through authed Worker routes |
| Auth | Supabase Auth | better-auth (~1.6) on D1 — see ADR 0010 |
| Authorization | Postgres RLS | Service-layer guards — see ADR 0011 |
| AI scoring worker | Supabase Edge Function (Deno, duplicated code) | Runs **in-process** in the app Worker (`ctx.waitUntil` + cron drain) |
| Scheduled jobs | Netlify scheduled functions | Cloudflare Cron Triggers (`scheduled()` handler) |
| DOCX→PDF | Fly.io LibreOffice container | **Retired.** PDF-only CVs at launch; revisit with Cloudflare Containers if DOCX demand is real |
| Domain | Netlify subdomain | `hr.matviet.com.vn` custom domain on the Worker |

Next.js 15 App Router stays — all UI, server actions, and module structure survive; only the data/auth/storage layers underneath change.

## Alternatives considered

- **Keep Supabase DB behind Hyperdrive, host on Workers.** Rejected: keeps two vendors and violates the "use D1/R2 fully" directive; Postgres features we actually use (RLS aside) have direct SQLite equivalents at our scale (≤5 users, ≤500 candidates/job).
- **Rewrite to a Workers-native stack (Hono + SPA).** Rejected: throws away ~10 build groups of working Next.js UI for zero user-visible gain.
- **Cloudflare Pages instead of Workers.** Rejected: Pages is in maintenance mode for full-stack Next; `@opennextjs/cloudflare` on Workers is the supported path and gives cron + D1/R2 bindings in one deployment.

## Consequences

- **Pro:** one dashboard, one CLI (wrangler), one bill (~$5/mo Workers Paid vs Supabase Pro $25 + Netlify + Fly); the Deno-duplicated scoring bundle disappears (single source of truth restored); local dev is fully offline via miniflare; D1 Time Travel (30 days) replaces PITR.
- **Con:** SQLite semantics — booleans are `INTEGER 0/1`, timestamps are ISO-8601 `TEXT` (UTC), enums become `TEXT + CHECK`, no DB views used by reports (rewritten as Drizzle queries), `PRAGMA foreign_keys` must stay on. No RLS (ADR 0011). Postgres-only features (partitioning, triggers) move to application code — at our scale none of them mattered.
- **Ops:** Supabase project paused after cutover verification; Netlify site deleted; `docs/runbook.md` procedures rewritten for wrangler.
- **Bundle risk:** exceljs + @react-pdf/renderer are heavy; Workers Paid raises the size limit to 10 MB gzip. If the server bundle still exceeds it, exports move client-side. Verified during build.

## Sanh's manual steps (blocking deploy, not development)

1. Create Cloudflare account; add `matviet.com.vn` zone **or** get IT to CNAME `hr.matviet.com.vn` to the Worker.
2. Enable Workers Paid plan ($5/mo).
3. Create an API token (Workers + D1 + R2 edit) and run `wrangler login` (or set `CLOUDFLARE_API_TOKEN`).
4. `wrangler secret put` for: `GEMINI_API_KEY`, `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_MAILBOX_ADDRESS`, `CRON_SECRET`, `BETTER_AUTH_SECRET`.
