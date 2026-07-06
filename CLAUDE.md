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

## Build status (as of 2026-07-03, post-pivot)

- **All feature groups 1–10 built** (foundation, jobs, candidates+CV, AI scoring, kanban, email send, calendar+Teams, interviews+approvals, assessments+CSV, reports).
- **Cloudflare pivot COMPLETE** (ADRs 0009–0013): D1+Drizzle data layer, R2 files, better-auth, Workers AI scoring (in-process), cron drains via `custom-worker.ts` `scheduled()`.
- **PRODUCTION LIVE at https://hr.matviet.com.vn** (custom_domain route; the workers.dev URL still serves as fallback — both hosts are in better-auth `trustedOrigins`).
  - **AI:** Workers AI, default `@cf/moonshotai/kimi-k2.6` — a REASONING model: give it generous `max_tokens` or it burns the whole budget thinking and returns empty (`finish_reason=length`). Admin model picker + kill switch + usage stats at `/cai-dat/he-thong`.
  - **Scoring reliability:** `SCORING_QUEUE` (Cloudflare Queues) fast path — the consumer invocation escapes the ~30s `ctx.waitUntil` cap that killed in-isolate runs — plus every-minute cron backstop and 3-min stale-`running` recovery. Never rely on a manual HTTP drain for long jobs: client disconnect kills the invocation.
  - **Outbound email:** Cloudflare Email Service (`send_email` binding `EMAIL`, from `hr@matviet.com.vn`, seam `src/server/email/transport.ts`; MS Graph fallback + still does calendar/Teams). ⚠️ matviet.com.vn MX = **Google Workspace** — NEVER enable CF Email Routing on that zone (it would hijack corporate inbound). Sanh must keep `hr@matviet.com.vn` existing in Google Workspace so replies land somewhere.
  - **Reports PDF** renders client-side (react-pdf WASM is forbidden on Workers) via `/api/reports/export/pdf-data` + `ReportPdfDoc` (Be Vietnam Pro from `public/fonts`).
- **Remaining:** Group 11 polish (Playwright e2e, axe, Sentry re-check), Supabase/Netlify decommission (checklist C8), per-email login lockout.
- **Local main is ahead of origin/main** — pushing to the protected default branch needs Sanh's go-ahead.
- **Windows dev quirk:** workerd crashes when started from this repo path (diacritics) during `next build` — `initOpenNextCloudflareForDev()` is guarded to dev-only in `next.config.ts`. `wrangler dev` / `d1` commands work fine.

## Modules (`app/src/server/*`) — keep in sync after every PR

| Module | What it does | README |
|---|---|---|
| `jobs` | Jobs CRUD repository + service | — |
| `candidates` | Candidate CRUD, CV upload, stage transitions | — |
| `scoring` | AI scoring pipeline (shared CV text extraction `extract-text.ts` also powers upload prefill, ADR 0015): `enqueueScoring` + `triggerScoring` (SCORING_QUEUE) → in-process `worker.ts` (Workers AI 2-pass via `toMarkdown`→parse→score, decoupled weights, evidence validation + anti-bluff cap 45) → cron drain `/api/scoring/drain` backstop. Manual-slider fallback for failed scoring | yes |
| `email` | Outbound queue → `transport.ts` `deliverMail` (Cloudflare Email Service first, MS Graph fallback) — every body wrapped in the branded navy+gold shell (`layout.ts`; DB templates stay content-only). Composer vars auto-resolve from candidate/job/interview data (`composer-defaults.ts`, ADR 0015). Templates are plain HTML `{{var}}` strings in DB (`template-render.ts` shared server+client). Retry: auth/permanent→fail now; throttle/transient→1m/5m/15m ×3. Drain `/api/emails/drain` batch=10, cron every minute | yes |
| `assessments` | Bài test send/receive/grade; 48h base64url tokens; public `/test/[token]` page | yes |
| `csv-import` | TopCV/CareerViet CSV bulk import; two-phase preview→commit; accent-stripped header maps | yes |
| `notifications` | In-app bell (TopBar, 60s poll) + Web Push (payload-free VAPID via WebCrypto; SW fetches content with its session cookie). Emitters: scoring done/failed, approval pending/finalized, interview created + ≤60-min reminder + stale-CV nudge (cron `/api/notifications/cron`), email dead-letter, new/offer-response candidate events. `notifyUsers`/`notifyRoles` swallow every error | yes |
| `apply` | Public careers intake (ADR 0014): `/tuyen-dung` + `POST /api/apply` → candidate (`source='careers_page'`, PDPD `consent_at`) + auto scoring + `receipt_ack` + bell. Honeypot + 3s fill-time + 5/h/IP + dup block. QR poster per job at `/tin-tuyen-dung/[id]/qr` | yes |
| `offers` | Offer magic link: `composeFromTemplate('offer')` mints 7-day token, injects `{{offer_link}}`; public `/nhan-viec/[token]` accept→`hired` / decline→`rejected` with `offer_response` recorded (offer-declines ≠ ordinary rejects). Group 13 onboarding trigger | yes |
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
- **Stack (post-pivot, ADRs 0009–0013):** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui, deployed to **Cloudflare Workers** via `@opennextjs/cloudflare` · **D1** (SQLite, Drizzle ORM) · **R2** (files) · **Queues** (scoring fast path) + **Cron Triggers** (every-minute backstop drains) · **better-auth** (ADR 0010) · **Workers AI** (default `@cf/moonshotai/kimi-k2.6`, admin-switchable) · **Cloudflare Email Service** (outbound, `hr@matviet.com.vn`) · Microsoft Graph API (calendar/Teams + email fallback)
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

## Database & platform workflow (post-pivot — wrangler, not Supabase MCP)

> The `mcp__supabase-matviet__*` tools are LEGACY (project pending decommission). Do not use them for new work.

| Task | Command | Verification + commit |
|---|---|---|
| Change schema | Edit `app/src/db/schema.ts` → `npm run db:generate` | Commit schema + generated `migrations-d1/NNNN_*.sql` together |
| Apply migration (local) | `npm run db:migrate:local` | Smoke via `wrangler d1 execute matviet-hr --local --command "..."` |
| Apply migration (prod) | `npm run db:migrate:remote` | **Pause and confirm with Sanh first**; D1 Time Travel (30d) is the rollback |
| Inspect data | `npx wrangler d1 execute matviet-hr --local\|--remote --json --command "..."` | No commit |
| Types | Derived automatically — `src/types/db.ts` infers from the Drizzle schema | Nothing to regenerate |
| Secrets | `npx wrangler secret put NAME` (Sanh runs; values never in chat/files) | Names listed in `wrangler.jsonc` header comment |
| Build worker bundle | `npx opennextjs-cloudflare build` | `.open-next/` is gitignored |
| Local run | `npm run dev` (Next dev + bindings) or `npx wrangler dev` (real worker) | — |
| Deploy | `npm run deploy` | Monitor `npx wrangler tail matviet-hr` for 5 min post-deploy |
| Logs | `npx wrangler tail matviet-hr` | Paste relevant lines into PR comment |
| First admin (fresh DB) | `POST /api/setup` with `Authorization: Bearer $CRON_SECRET` + JSON {email,password,name} | One-time; 409 afterwards |

**Migration policy:** D1 has no database branches. Destructive migrations (drop/rename on `candidates`, `interviews`, `approvals`, `email_messages`) get tested on the local D1 first, applied remotely only after Sanh confirms; Time Travel is the recovery path (`wrangler d1 time-travel restore`).

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

# Cloudflare (see "Database & platform workflow" above)
npm run db:generate        # drizzle-kit generate (after editing src/db/schema.ts)
npm run db:migrate:local   # apply migrations to local D1
npm run db:migrate:remote  # apply to production D1 (confirm with Sanh first)
npm run preview            # opennextjs build + local preview
npm run deploy             # opennextjs build + wrangler deploy

# PR
gh pr create --fill
gh pr view --web
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
