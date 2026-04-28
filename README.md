# Mắt Việt HR

Internal AI-powered Applicant Tracking System (ATS) for Mắt Việt — Vietnamese optical retail chain. Vietnamese-only UI.

## Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion
- **Backend:** Supabase (Auth + Postgres + Storage + RLS) + Edge Functions
- **AI:** Google Gemini 2.5 Flash (CV parsing + scoring)
- **Email/Calendar:** Microsoft Graph API (Office 365)
- **Hosting:** Netlify
- **Worker (DOCX→PDF):** Fly.io with LibreOffice

## Project status

**Currently in pre-build planning.** Build kicks off Group 1 (Foundation) once foundation prerequisites land.

## Repository contents (post-Group 1)

```
matviet-hr/
├── CLAUDE.md                 ← agent operating manual (read first)
├── README.md                 ← this file
├── .mcp.json                 ← project-scope Supabase MCP (gitignored — contains token)
├── .mcp.example.json         ← MCP config template (committed)
├── .gitignore
├── .env.example              ← env-var template
├── .env.local                ← real env vars (gitignored)
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── netlify.toml
├── docs/                     ← split documentation (PRD, architecture, decisions, content)
├── public/                   ← static assets (brand, fonts, illustrations)
├── src/
│   ├── app/                  ← Next.js App Router pages + API routes
│   ├── components/
│   ├── lib/                  ← Supabase clients, AI, Graph, integrations, utils
│   ├── server/               ← server-only business logic
│   ├── stores/               ← Zustand
│   ├── hooks/
│   └── types/
├── supabase/
│   ├── migrations/
│   ├── functions/            ← edge functions
│   └── seed.sql
├── libreoffice-worker/       ← Fly.io DOCX worker
└── tests/
    ├── e2e/
    └── unit/
```

## Local development setup

> Requires: Node 20+, npm/pnpm, Git, Supabase CLI, Netlify CLI, Fly CLI, GitHub CLI

```bash
# 1. Clone
git clone <repo-url> matviet-hr
cd matviet-hr

# 2. Install deps
npm install

# 3. Copy env template and fill in real values
cp .env.example .env.local
# Edit .env.local with your Supabase URL, anon key, service role key, Gemini API key, MS Graph creds

# 4. Set up Supabase MCP (if you're using Claude Code)
cp .mcp.example.json .mcp.json
# Edit .mcp.json — replace REPLACE_WITH_YOUR_PERSONAL_ACCESS_TOKEN with your Supabase PAT
# Quit and re-launch Claude Code from this directory

# 5. Apply migrations
npx supabase db push

# 6. Generate TS types
npx supabase gen types typescript --linked > src/types/db.ts

# 7. Seed dev data
npm run db:seed

# 8. Run
npm run dev          # http://localhost:3000
```

## Common tasks

```bash
npm run dev          # Local dev server
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run e2e          # Playwright E2E
npm run db:seed      # Reload deterministic dev data

# Migrations (via Claude Code + Supabase MCP)
# Claude calls mcp__supabase-matviet__apply_migration; SQL is mirrored to supabase/migrations/

# Deploy
git push origin main # Netlify auto-deploys main
```

## Configuration

All secrets live in `.env.local` (gitignored). See `.env.example` for the complete list.

| Variable | Source | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project | Browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project | Browser + server |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project (server-only) | Server (admin queries) |
| `GEMINI_API_KEY` | Google Cloud | Server (AI scoring) |
| `MS_TENANT_ID` | Mắt Việt IT | Server (Graph) |
| `MS_CLIENT_ID` | Mắt Việt IT | Server (Graph) |
| `MS_CLIENT_SECRET` | Mắt Việt IT | Server (Graph) |
| `MS_MAILBOX_ADDRESS` | hr@matviet.com.vn | Server (Graph) |
| `LIBREOFFICE_WORKER_URL` | Fly.io | Server (DOCX→PDF) |
| `LIBREOFFICE_WORKER_SECRET` | Sanh-generated | Server (worker auth) |
| `CRON_SECRET` | Sanh-generated | Server (scheduled functions) |
| `SENTRY_DSN` | Sentry | Browser + server |

## Documentation map

| What | Where |
|---|---|
| Operating manual for Claude Code | `CLAUDE.md` |
| Product requirements | `docs/PRD.md` |
| Tech architecture (DB schema, RLS) | `docs/architecture.md` |
| UI/UX spec | `docs/ui-ux.md` |
| External integrations | `docs/integrations.md` |
| Internal API | `docs/api.md` |
| Asset & dependency checklist | `docs/infra-checklist.md` |
| Operational runbook | `docs/runbook.md` |
| Privacy notice (candidate-facing, Vietnamese) | `docs/privacy-notice-vi.md` |
| Architecture Decision Records | `docs/decisions/` |
| Email templates (Vietnamese) | `docs/content/email-templates.md` |
| Scoring rubrics (per role family) | `docs/content/scoring-rubrics.md` |
| UI strings (Vietnamese i18n) | `docs/content/ui-strings.md` |
| Build log (decisions in chat) | `docs/build-log.md` |
| Supabase database branches | `docs/branch-log.md` |

## License

Internal — Mắt Việt proprietary.

## Contact

- **Project owner / dev:** Sanh Võ
- **Primary user:** chị Bùi Thị Hương (HR Staff)
- **Company:** Mắt Việt (Mat Viet Optical)
