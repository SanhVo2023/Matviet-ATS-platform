# Mắt Việt HR

Internal AI-powered HR platform for Mắt Việt — Vietnamese optical retail chain. Vietnamese-only UI. Today an Applicant Tracking System (ATS); architected to grow into an all-in employee management system (see `docs/decisions/0012-employee-management-foundation.md`).

## Stack (Cloudflare-native since 2026-07, ADR 0009)

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion
- **Runtime:** Cloudflare Workers via `@opennextjs/cloudflare`
- **Database:** Cloudflare D1 (SQLite) + Drizzle ORM
- **Files:** Cloudflare R2 (CVs, tests, submissions) streamed through authed routes
- **Auth:** better-auth (email/password, admin-created accounts, 8h sessions)
- **AI:** Google Gemini 2.5 Flash (CV parse + 2-pass scoring, in-process queue worker)
- **Email/Calendar:** Microsoft Graph API (Office 365) — plain fetch, no SDK
- **Cron:** Cloudflare Cron Triggers (scoring + email queue drains, every 5 min)
- **Target domain:** `hr.matviet.com.vn`

## Project status

Feature groups 1–10 built (jobs, candidates + CV upload, AI scoring, kanban pipeline, email automation, Outlook/Teams interviews, reviews + approvals, assessments + CSV import, reports). Cloudflare pivot complete and verified locally. Remaining: Group 11 polish + production deploy (see `docs/infra-checklist.md` §Cloudflare).

## Repository layout

```
<root>/
├── CLAUDE.md                 ← agent operating manual (read first)
├── docs/                     ← PRD, architecture, ADRs, runbook, content
└── app/                      ← the Next.js project (run all npm commands here)
    ├── src/app/              ← App Router, Vietnamese slugs (tin-tuyen-dung, ung-vien, …)
    ├── src/server/<module>/  ← server-only business logic (one README per module)
    ├── src/db/               ← Drizzle schema (single source of truth) + accessor
    ├── src/lib/              ← auth, graph, gemini, r2, validation, i18n
    ├── migrations-d1/        ← generated SQLite migrations (wrangler applies)
    ├── supabase/migrations/  ← LEGACY Postgres history (pre-pivot, reference only)
    ├── custom-worker.ts      ← Worker entry: OpenNext fetch + cron scheduled()
    └── wrangler.jsonc        ← bindings: DB (D1), FILES (R2), crons
```

## Local development

> Requires: Node 20+, npm. No external services needed — D1/R2 run locally via miniflare.

```bash
cd app
npm install
cp .dev.vars.example .dev.vars     # fill Gemini + MS Graph creds (optional for UI work)
npm run db:migrate:local           # create + seed the local D1 database
npm run dev                        # Next dev with local bindings → http://localhost:3000

# OR run the real Worker locally:
npx opennextjs-cloudflare build && npx wrangler dev

# First admin account (fresh DB):
curl -X POST http://localhost:8787/api/setup \
  -H "Authorization: Bearer $CRON_SECRET" -H "content-type: application/json" \
  -d '{"email":"you@matkinh.com.vn","password":"...","name":"Your Name"}'
```

## Common commands

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run test         # Vitest (69 tests)
npm run test:e2e     # Playwright
npm run db:generate  # emit migration after editing src/db/schema.ts
npm run deploy       # build + deploy to Cloudflare (needs wrangler login)
```

## Configuration

Local secrets in `app/.dev.vars` (gitignored, template: `.dev.vars.example`); production secrets via `npx wrangler secret put <NAME>`:

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL` | CV scoring |
| `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_MAILBOX_ADDRESS` | Graph email + calendar |
| `CRON_SECRET` | Drain routes + first-admin setup |
| `BETTER_AUTH_SECRET` | Session signing |

## Documentation map

| What | Where |
|---|---|
| Operating manual for Claude Code | `CLAUDE.md` |
| Product requirements | `docs/PRD.md` |
| Architecture Decision Records (0009–0012 = Cloudflare pivot) | `docs/decisions/` |
| Asset & dependency checklist (Sanh's manual steps) | `docs/infra-checklist.md` |
| Operational runbook | `docs/runbook.md` |
| Build log (chat-time decisions) | `docs/build-log.md` |
| Per-module internals | `app/src/server/<module>/README.md` |

## Contact

- **Project owner / reviewer:** Sanh Võ
- **Primary user:** chị Bùi Thị Hương (HR Staff)
- **Company:** Mắt Việt (Mat Viet Optical)
