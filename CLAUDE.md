# Mắt Việt HR — Agent Operating Manual

You are building an internal-HR ATS for Mắt Việt (Vietnamese optical retail chain). Vietnamese-only UI. Built end-to-end by Claude Code under Sanh Võ's review.

**Read this file on every session.** It's the navigator.

> **⚡ PLATFORM PIVOT (2026-07-02, Sanh directive):** The app is migrating from Supabase+Netlify+Fly.io to **Cloudflare (Workers + D1 + R2 + Cron Triggers)**, target domain `hr.matviet.com.vn`. Read ADRs **0009–0012** before touching data/auth/storage code. The Supabase MCP tools and `supabase/` folder are legacy during the transition — new DB work happens in `app/src/db/` (Drizzle) + `app/migrations-d1/`. The old master plan (`~/.claude/plans/mutable-crunching-coral.md` v5.0) is **superseded** where it conflicts with the ADRs. The app is also being positioned as the base of an all-in employee management system (ADR 0012) — foundation only, don't build HRIS features without a new directive.

---

## Repository layout (important — app is NOT at repo root)

The Next.js app lives in the **`app/` subdirectory**. All npm scripts, `package.json`, `tsconfig.json`, `.env.local`, and the `supabase/` folder are under `app/`. Run every npm command from `app/`. Doc paths in this file like `src/server/...` mean `app/src/server/...`.

```
<repo root>/
├── CLAUDE.md, README.md, docs/     ← docs live at ROOT
├── .mcp.json                        ← Supabase MCP config (gitignored; template: .mcp.example.json)
├── .husky/                          ← pre-commit: lint-staged (prettier) on app/** JS/TS files
├── .github/workflows/ci.yml         ← CI: typecheck + lint + build (working-directory: app)
├── libreoffice-worker/              ← Fly.io DOCX→PDF worker (scaffolded, NOT yet deployed)
├── tests/fixtures/                  ← shared test fixtures (CSV samples)
└── app/                             ← the Next.js project
    ├── src/app/                     ← App Router; VIETNAMESE route slugs:
    │   ├── (auth)/dang-nhap, dat-lai-mat-khau
    │   ├── (dashboard)/tin-tuyen-dung (jobs), ung-vien (candidates),
    │   │   email, bao-cao (reports), cai-dat (settings: bai-test, nguoi-dung)
    │   ├── test/[token]             ← public (no-auth) assessment submission page
    │   └── api/                     ← scoring/drain + emails/drain (cron via CRON_SECRET),
    │                                  reports/export/{pdf,excel}, test/submit
    ├── src/server/<module>/         ← server-only business logic (see Modules below)
    ├── src/lib/                     ← supabase clients (client/server/admin), ai/gemini,
    │                                  graph (MSAL + sendMail), validation (Zod), vi-format
    ├── src/components/, src/types/db.ts (generated), src/__test__/
    ├── supabase/migrations/         ← 0001–0019 mirrored SQL
    ├── supabase/functions/score-candidate/  ← Deno edge function (code DUPLICATED from
    │                                  src/lib/ai/gemini + src/server/scoring; Next side
    │                                  is the single source of truth — sync on change)
    └── netlify/                     ← scheduled-function shims that hit the /api drains
```

`@/` path alias → `app/src/` (configured in both `tsconfig.json` and `vitest.config.ts` — Vitest needs its own alias entry).

## Build status (as of 2026-07-02, post-consolidation)

- **Merged to main:** Groups 1–6, 8, 9, 10 (foundation, jobs, candidates+CV, AI scoring, kanban, email send, interviews+approvals, assessments+CSV, reports). 69 tests green, build clean, 31 routes.
- **In progress:** Cloudflare pivot (`feat/12-cloudflare-pivot`) per ADR 0009 — D1/R2/Workers port of the data, auth, storage, and cron layers.
- **Remaining features:** Group 7 (Outlook calendar + Teams links for interviews — scheduling UI exists from G8, Graph event creation missing), Group 11 (polish/launch at hr.matviet.com.vn).
- **Local main is ahead of origin/main** — pushing to the protected default branch needs Sanh's go-ahead.

## Modules (`app/src/server/*`) — keep in sync after every PR

| Module | What it does | README |
|---|---|---|
| `jobs` | Jobs CRUD repository + service | — |
| `candidates` | Candidate CRUD, CV upload, stage transitions | — |
| `scoring` | AI scoring pipeline: `enqueueScoring` → edge function `score-candidate` (Gemini 2-pass, decoupled weights, Fuse.js evidence validation) → cron drain `/api/scoring/drain`. Manual-slider fallback for failed scoring | yes |
| `email` | Outbound queue → MS Graph `/sendMail`. Templates are plain HTML `{{var}}` strings in DB (`template-render.ts` shared server+client). Retry: auth/permanent→fail now; throttle/transient→1m/5m/15m ×3. Drain `/api/emails/drain` batch=10 every 5 min | yes |
| `assessments` | Bài test send/receive/grade; 48h base64url tokens; public `/test/[token]` page | yes |
| `csv-import` | TopCV/CareerViet CSV bulk import; two-phase preview→commit; accent-stripped header maps | yes |
| `reports` | 6 charts + PDF/Excel export + demo seeder; all queries take a `ReportFilter` | yes |

---

## Quick navigation

| When you need... | Read |
|---|---|
| Product context, FRs, personas, scope decisions | `docs/PRD.md` |
| Database schema, RLS, project structure | `docs/architecture.md` |
| Design system, page specs, persona-scoped IA, mobile strategy | `docs/ui-ux.md` |
| Gemini, MS Graph, TopCV/CareerViet specs | `docs/integrations.md` |
| Internal API route handlers | `docs/api.md` |
| Asset & dependency checklist (Sanh's tasks, IT tickets) | `docs/infra-checklist.md` |
| Operational procedures (rotate secrets, restore PITR, etc.) | `docs/runbook.md` |
| Why we DIDN'T do X | `docs/decisions/000N-*.md` (ADRs) |
| Email template VN copy | `docs/content/email-templates.md` |
| Scoring rubric guidance per role family | `docs/content/scoring-rubrics.md` |
| Vietnamese i18n source | `docs/content/ui-strings.md` |
| What's been decided in chat that's not yet an ADR | `docs/build-log.md` |
| Supabase database branch lifecycle | `docs/branch-log.md` |
| Per-module internals | `app/src/server/<module>/README.md` |

---

## Project facts (memorize)

- **Supabase project:** `Mắt Việt HR application`, ref `xeyqbapegqeibeqrwnkm`, region `ap-southeast-2` (Sydney), Postgres 17.6.1.111
- **Supabase MCP namespace:** `mcp__supabase-matviet__*` (project-scope; loaded from `.mcp.json`)
- **Project owner / reviewer:** Sanh Võ
- **Primary user:** chị Bùi Thị Hương, HR Staff, 3 years experience, low-tech
- **Secondary users:** Trưởng phòng (Hiring Manager) — bursty, mobile-on-store-floor; BOD/Tập đoàn — rare exec approvers
- **Candidates:** no app account — email-only interaction
- **Scale:** 1–3 jobs/month, 20–50 CVs/job, ≤5 users, ≤5 outbound emails/day
- **Stack (post-pivot, ADR 0009):** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui, deployed to **Cloudflare Workers** via `@opennextjs/cloudflare` · **D1** (SQLite, Drizzle ORM) · **R2** (files) · **Cron Triggers** (queues drain) · **better-auth** (ADR 0010) · Gemini 2.5 Flash · Microsoft Graph API
- **Legacy stack (being decommissioned):** Supabase project ref `xeyqbapegqeibeqrwnkm` (pause after cutover), Netlify, Fly.io worker (never deployed — retired)

---

## Operating model

**You are the builder. Sanh is reviewer + product owner.** Sanh does not type code.

### Auto-mode rules
- **Proceed autonomously on:** code changes, migrations on dev branches, type regen, edge function deploys to dev, log fetching, advisor checks, dependency installs, test runs, doc updates.
- **Pause and ask on:**
  - Supabase MCP cost confirmations (`get_cost` → present to Sanh → `confirm_cost`)
  - Production migration merges (`merge_branch` from dev to main DB)
  - Any secret value (Sanh pastes — never echoed)
  - Destructive ops (`reset_branch`, `delete_branch` of unmerged work, dropping main tables)
  - High-severity advisor RLS gap that needs policy clarification
  - UI judgment calls that need visual verification

### PR-based workflow per build group
Each of the 11 build groups becomes one or more feature branches: `feat/01-foundation`, `feat/02-jobs-crud`, etc.

1. Write code on the branch, commit incrementally with conventional-commit messages.
2. Before opening the PR, self-run `/simplify` skill.
3. Open the PR via `gh pr create` with a structured body (summary, schema diffs, edge function changes, migration list, advisor report).
4. Self-run `/review` skill against the diff; address findings in a follow-up commit.
5. **Auth, RLS, email-send, file uploads, secret handling → self-run `/security-review`.**
6. Sanh reviews, comments, you respond.
7. On approval: merge. Netlify auto-deploys main. Monitor `get_logs` for 5 minutes; report tail status.

### Documentation discipline
- After every PR: diff `CLAUDE.md`'s Modules section against `src/server/*` and either update inline or file a `chore: refresh CLAUDE.md` follow-up. Drift older than two PRs blocks the next merge.
- After every accepted/rejected design decision: **append a one-liner to `docs/build-log.md`**.
- When a decision is significant enough to outlive the session: **promote to a numbered ADR** at `docs/decisions/00NN-<slug>.md`.
- Per-module README at `src/server/<module>/README.md` — created with the module, updated in same PR.

### Skill invocation map per build group

| Group | feature-dev | frontend-design | review | security-review | simplify | init |
|---|---|---|---|---|---|---|
| 1. Foundation | yes | login + shell only | every PR | yes (auth + RLS) | end of group | **yes — `init` here** |
| 2. Jobs CRUD | no | yes | every PR | no | yes | no |
| 3. Candidates + CV upload | yes | yes | every PR | **yes** (Storage upload, MIME) | yes | no |
| 4. AI scoring (Gemini) | yes | yes | every PR | **yes** (API key, PII) | yes | no |
| 5. Pipeline (kanban) | yes | **yes — flagship** | every PR | no | yes | no |
| 6. Email automation | yes | yes | every PR | **yes** (send paths, secrets) | yes | no |
| 7. Calendar (Graph) | yes | yes | every PR | **yes** (OAuth, tokens) | yes | re-run `init` |
| 8. Interview reviews + approvals | no | yes | every PR | yes (approval RLS) | yes | no |
| 9. Assessments + CSV import | yes | yes | every PR | **yes** (CSV parsing) | yes | no |
| 10. Reports | no | yes | every PR | no | yes | no |
| 11. Polish + launch | no | yes | every PR | **yes** (full sweep) | yes | **re-run `init`** |

---

## MCP usage map

| Manual step | MCP replacement | Verification + commit |
|---|---|---|
| Apply migration | `mcp__supabase-matviet__apply_migration(name='000N_*', query=...)` | Mirror to `supabase/migrations/000N_*.sql` and commit |
| Generate TS types | `mcp__supabase-matviet__generate_typescript_types` | Save to `src/types/db.ts` and commit in same PR as migration |
| Inspect schema | `list_tables`, `list_extensions`, `list_migrations` | No commit |
| Read-only inspection / seed | `execute_sql(query=...)` | Seed SQL to `supabase/seed.sql` if it's a permanent seed |
| RLS audit | `get_advisors(type='security')` after any migration changing tables/policies | Findings in PR description "Advisor Report"; high-severity blocks merge |
| Risky migration on prod | `create_branch` → apply on branch → smoke via `execute_sql` → `merge_branch` after Sanh OK, or `delete_branch` if rolled back | Branch lifecycle in `docs/branch-log.md` |
| Edge function deploy | `deploy_edge_function(name='cv-parse', files=[...])` | Source under `supabase/functions/<name>/index.ts`; deploy SHA in PR |
| Tail logs | `get_logs(service='postgres'\|'auth'\|'storage'\|'edge-function')` | Paste into PR comment |

**Branching policy:** any migration touching `candidates`, `applications`, `interview_reviews`, `email_logs`, `approvals` MUST go through `create_branch` → test → merge. Pure additive migrations on new tables can apply directly to main.

---

## Fresh docs lookup (Context7 MCP)

When starting any module touching the libraries below, query Context7 (`mcp__plugin_context7_context7__resolve-library-id` then `query-docs`) before writing code:

| Library | What to look up |
|---|---|
| Next.js 15 | App Router server actions, async `cookies()`, middleware matcher |
| `@supabase/ssr` | `createServerClient` cookie adapter for App Router Next 15 |
| `@google/genai` | `responseSchema`, `responseMimeType`, file input |
| `@microsoft/microsoft-graph-client` + MSAL Node | `ConfidentialClientApplication`, `/users/{id}/sendMail`, calendar `isOnlineMeeting:true` |
| React Email v3 | `render()` async API, Tailwind preset |
| Tiptap | `StarterKit`, schema serialization |
| Recharts | `ResponsiveContainer` SSR pattern |
| `@react-pdf/renderer` | Font registration for Vietnamese diacritics |
| Framer Motion v11 | `motion/react` import path |

If a doc lookup contradicts training-data memory: trust the lookup, log surprise to `docs/build-log.md`. If Context7 disconnects, fall back to `WebFetch` against canonical URLs.

**Skip lookups for:** Tailwind utility classes, Zod basics, plain TypeScript, SQL.

---

## Operational defaults (locked 2026-04-21)

### Hard limits
- CV file size: max 10 MB
- Email body: max 50 KB rendered HTML
- Candidates per job: max 500 (warn at 200)
- Concurrent CV uploads: max 5
- Maximum CV pages: 20

### Cost guardrails
- Gemini soft alert: $5/day (email Sanh)
- Gemini hard cap: $25/day (circuit-break scoring queue)
- Storage soft alert: 50 GB

### Browser support
Chrome / Edge / Firefox / Safari latest 2 versions. No IE. No old Android stock browser.

### Locale & format (Vietnam)
- Server: UTC; Render: `Asia/Ho_Chi_Minh`
- Date: `dd/MM/yyyy`; Time: `HH:mm` (24h); First day of week: Monday
- Currency: `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` → `1.000.000 ₫`
- Phone: store E.164 (`+84901234567`), display `0901 234 567`

### Retention
- `activity_logs` 2y (monthly partition at >100K rows)
- `email_logs` 2y
- `ai_screenings` forever (audit)
- `scoring_queue` 30d post-completion
- `scheduled_emails` 90d post-send

### Security baseline
- Pre-commit (Husky): `gitleaks` + `eslint --fix` + `tsc --noEmit` + `prettier --check`
  — **currently implemented:** lint-staged runs `prettier --write` only; gitleaks/eslint/tsc pre-commit are a Group 11 task
- CI (GitHub Actions on PR): `tsc --noEmit`, `vitest run`, `playwright test --project=chromium`, `axe-core` on 5 critical pages
  — **currently implemented:** typecheck + lint + build only (`.github/workflows/ci.yml`); vitest/playwright/axe in CI are a Group 11 task
- CSP: strict per route; defined in `next.config.mjs` + `middleware.ts`
- Auth session timeout: 8h inactivity; refresh token rotation enabled
- Failed login rate limit: 5 attempts/15min per IP+email; 1h lockout

---

## Build sequence — 11 groups (dependency-ordered)

1. **Foundation** — Next.js 15 + Tailwind + shadcn/ui + Supabase auth + RLS skeleton + layout shell
2. **Jobs CRUD** — list, create, edit, weights editor, role-family templates
3. **Candidates + CV upload** — manual upload, parse, storage, list
4. **AI Scoring (Gemini)** — async queue, decoupled per-criterion scoring, evidence validation
5. **Pipeline (Kanban + Excel-style table)** — drag-drop, dual view, bulk actions
6. **Email Automation** — MS Graph send, React Email templates, hybrid auto/HR-approved
7. **Calendar & Interviews (Graph)** — Outlook events with Teams link auto-gen
8. **Interview Reviews + Approvals** — review form, two-preset approval engine
9. **Assessments + CSV Import (TopCV/CareerViet)**
10. **Reports & Analytics** — funnel, time-to-hire, source effectiveness, PDF/Excel export
11. **Polish & Launch** — Playwright, axe-core, Sentry, soft launch

---

## Commands

All npm commands run from **`app/`**, not repo root.

```bash
cd app

# Dev
npm run dev          # local Next.js (http://localhost:3000)
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm run format       # prettier --write src/**

# Tests
npm run test         # Vitest (run once)
npm run test:watch   # Vitest watch mode
npx vitest run src/server/email/sender.test.ts   # single test file
npm run test:e2e     # Playwright

# DB / data
npm run db:types     # regen src/types/db.ts from Supabase (or use MCP generate_typescript_types)
npm run seed:demo    # demo data for reports

# Migrations (via MCP, mirrored locally)
# Use mcp__supabase-matviet__apply_migration directly; commit SQL to app/supabase/migrations/

# PR
gh pr create --fill
gh pr view --web

# Logs (via MCP)
# Use mcp__supabase-matviet__get_logs(service='postgres'|'auth'|'storage'|'edge-function')
```

---

## Risks specific to this project

- **Visual blind spot.** You can't see rendered UI. Ask Sanh to screenshot after each `frontend-design` pass; commit Playwright screenshots-on-failure under `tests/visual/`; rely on Netlify deploy previews.
- **Cost confirmations interrupt flow.** Batch all cost-bearing MCP calls at the start of each build group (project create, paid-tier upgrade, edge function quota) so Sanh confirms once.
- **Token budget on long sessions.** Checkpoint with `init` re-run at end of Groups 1, 7, 11; summarize state into `docs/build-log.md` so a fresh session can resume cold.
- **CLAUDE.md drift.** Diff modules section vs `src/server/*` at end of each PR.
- **Database branch sprawl.** `docs/branch-log.md` tracks every `create_branch`. >7 days unmerged → flag. On PR merge, branch merged or deleted same chat turn.
- **Secret leakage.** `.env.local` git-ignored from foundation; gitleaks pre-commit; PR template has "secrets scanned" checkbox.

---

## When in doubt

1. Read the master plan: `C:\Users\thach\.claude\plans\mutable-crunching-coral.md` (v5.0).
2. Search ADRs in `docs/decisions/` for prior decisions on the topic.
3. Read `docs/build-log.md` for chat-time decisions not yet promoted to ADRs.
4. Ask Sanh — but only if 1–3 didn't answer it.
