# Architecture — Mắt Việt HR

**Version:** v5.0 (extracted from master plan)
**Stack:** Next.js 15 + Supabase + Gemini 2.5 Flash + Microsoft Graph + Netlify

---

## 1. High-level architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  [Laptop / phone]                                                 │
│     ↓ HTTPS                                                       │
│  [Netlify CDN + Scheduled Functions]                              │
│     ↓                                                             │
│  [Next.js 15 App Router]                                          │
│     ├─ UI: shadcn/ui + Tailwind + Framer Motion                   │
│     ├─ State: Zustand + React Query v5                            │
│     └─ API routes ───┬─→ [Supabase] (Postgres + Auth + Storage)   │
│                      ├─→ [Google Gemini 2.5 Flash]                │
│                      ├─→ [Microsoft Graph API] (hr@matviet.com.vn)│
│                      └─→ [LibreOffice Worker on Fly.io]           │
└──────────────────────────────────────────────────────────────────┘
```

**Supabase project:** `Mắt Việt HR application`, ref `xeyqbapegqeibeqrwnkm`, region `ap-southeast-2` (Sydney), Postgres 17.6.1.111, Pro plan.

---

## 2. Tech stack table

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript | RSC for data-heavy lists, API routes for webhooks |
| Styling | Tailwind v3.4 + shadcn/ui (Radix-based) | Utility-first; copy-paste components we own |
| Animation | Framer Motion v11 | Spring physics, layout animations, reduced-motion support |
| Forms | react-hook-form + Zod | Type-safe validation |
| State | Zustand (UI) + @tanstack/react-query v5 (server) | Lightweight + cache + optimistic updates |
| Data viz | Recharts | Themeable, accessible |
| Rich text | Tiptap (ProseMirror) | Vietnamese-safe, customizable |
| PDF viewer | react-pdf | Inline CV preview |
| PDF export | @react-pdf/renderer | Reports |
| Excel export | exceljs | Reports |
| DB + Auth + Storage | Supabase Pro | Postgres 17 + RLS + Auth + Storage + Realtime + Edge Functions |
| AI | Google Gemini 2.5 Flash (`@google/genai`) | Native PDF input, `responseSchema`, Vietnamese-capable |
| Email + Calendar | Microsoft Graph v1.0 + MSAL Node | Send as hr@matviet.com.vn, inbox polling, Teams link auto-gen |
| DOCX → PDF | LibreOffice headless on Fly.io | Netlify functions can't run libreoffice |
| Hosting (web) | Netlify | CI/CD + CDN + scheduled functions + env management |
| Email templates | React Email v3 | Type-safe HTML, Tailwind preset |
| Monitoring | Sentry + Better Stack | Errors + uptime |
| Testing | Vitest + Playwright + axe-core | Modern, Vietnamese-string-safe |

---

## 3. Database schema

> **Canonical source: `app/supabase/migrations/0001_*.sql` through `0010_*.sql`.** Field-level details below describe design intent; treat any divergence between this section and the migration files as the migration files being authoritative. TypeScript types are generated from the live database via `mcp__supabase-matviet__generate_typescript_types` into `src/types/db.ts` — that file is the runtime source of truth for application code.
>
> **Key naming differences to remember (active in migrations, may differ from design-intent prose below):**
> - `user_role`: `admin | hr | hiring_manager | bod | tap_doan` (5 values, not 3 — BOD and Tập đoàn need their own roles for management-flow approvals)
> - `pipeline_stage`: 16 values including `test_sent`, `test_done`, `recommended`, `salary_deal`, `tap_doan_review`, `withdrew` (not `assessment_*`/`proposed`/`salary_negotiation`/`group_review`/`withdrawn`)
> - `role_family`: `sales | optician | office | manager | custom`
> - `recommendation`: `strong_yes | yes | maybe | no`
> - `email_status`: `queued | pending_approval | sent | delivered | failed | received`
> - `approval_step_kind`: `hr_recommend | manager_recommend | salary_deal | bod | tap_doan`
> - Tables: `interview_attendees`, `interview_evaluations`, `email_messages`, `audit_log`, `cv_files` (CV blobs in a separate table joined via `candidates.cv_file_id`), `stage_history`, `referrals`, `assessment_submissions`, `inbox_attachments` — alongside `profiles`, `departments`, `jobs`, `job_assignments`, `weight_templates`, `candidates`, `ai_screenings`, `assessments`, `approvals`, `email_templates`
> - `notifications`, `scoring_queue`, `scheduled_emails` are **not yet in migrations** — to be added in Group 4 (scoring queue) and Group 6 (notifications + scheduled emails) as additive migrations
> - Storage buckets: `cvs | assessments | submissions | email-attachments | assets` (5 buckets, not 3)

All tables in `public` schema. UUID PKs via `gen_random_uuid()`. Every table has `created_at`/`updated_at` (trigger-maintained). See `app/supabase/migrations/000N_*.sql` for the canonical SQL.

### 3.1 Enums

```sql
CREATE TYPE user_role           AS ENUM ('admin','hr_staff','hiring_manager');
CREATE TYPE job_status          AS ENUM ('draft','open','paused','closed','filled');
CREATE TYPE flow_type           AS ENUM ('staff','management');
CREATE TYPE role_family         AS ENUM ('sales','optical_tech','office','management');
CREATE TYPE candidate_stage     AS ENUM (
  'new','screening','screened','interview_scheduled','interviewed',
  'assessment_sent','assessment_done','proposed','salary_negotiation',
  'bod_review','group_review','offer_sent','offer_accepted','hired','rejected','withdrawn'
);
CREATE TYPE cv_source           AS ENUM ('manual_upload','email_inbox','csv_import','topcv_api','referral');
CREATE TYPE approval_step_status AS ENUM ('pending','approved','rejected','skipped');
CREATE TYPE approval_actor      AS ENUM ('hr_and_manager','hr_salary','bod','group','offer');
CREATE TYPE email_direction     AS ENUM ('outbound','inbound');
CREATE TYPE email_status        AS ENUM ('draft','queued','sent','failed','received','parsed','bounced');
CREATE TYPE email_category      AS ENUM (
  'receipt_ack','reminder','interview_invite','assessment_send',
  'offer','rejection','approval_request','custom'
);
CREATE TYPE assessment_type     AS ENUM ('file_upload','form');
CREATE TYPE assessment_status   AS ENUM ('draft','sent','submitted','reviewed','expired');
CREATE TYPE interview_type      AS ENUM ('in_person','phone','video');
CREATE TYPE interview_status    AS ENUM ('scheduled','completed','cancelled','no_show','rescheduled');
CREATE TYPE recommendation      AS ENUM ('strong_hire','hire','maybe','no_hire');
CREATE TYPE ai_screening_status AS ENUM ('pending','running','success','failed');
CREATE TYPE scoring_job_status  AS ENUM ('queued','running','succeeded','failed','cancelled');
```

### 3.2 Tables (15 total + lookup)

#### Core identity
- **`profiles`** — `id (FK auth.users)`, `email UNIQUE`, `full_name`, `role`, `department_id`, `phone`, `avatar_url`, `is_active`
- **`departments`** — `id`, `name UNIQUE`, `slug UNIQUE`, `head_id (FK profiles)`

#### Jobs
- **`jobs`** — `id`, `title`, `department_id`, `role_family`, `flow_type`, `status`, `description`, `requirements`, `location`, `employment_type`, `salary_min/max`, `salary_negotiable`, `headcount`, `weights jsonb` (sums to 1.0), `criteria_config jsonb`, `test_file_path`, `hiring_manager_id`, `created_by`, `opened_at`, `closed_at`, `deleted_at`
- **`job_assignments`** — `(job_id, user_id, role)` PK; for interviewers/approvers outside their department

#### Candidates
- **`candidates`** — `id`, `job_id`, `full_name`, `email`, `phone`, `cv_file_path` (Storage), `cv_raw_text`, `cv_parsed jsonb` (skills, experience, education, certifications, languages), `source`, `source_meta jsonb`, `stage`, `ai_score numeric(5,2)` (denormalized weighted_total — re-computed when job.weights change), `ai_scored_at`, `ai_screening_status`, `ai_screening_error`, `last_stage_changed_at`, `deleted_at`

  Indexes: `(job_id, stage) WHERE deleted_at IS NULL`, `lower(email)`, GIN on `to_tsvector('simple', cv_raw_text)`, GIN on `cv_parsed -> 'skills'`, `(ai_score DESC) WHERE deleted_at IS NULL`, `ai_screening_status WHERE in ('pending','failed')`

#### AI Scoring
- **`ai_screenings`** — `id`, `candidate_id`, `model`, `parse_response jsonb`, `score_response jsonb`, `scores jsonb` (per-criterion `{score, reasoning, evidence_quotes: [{text, verified}]}`), `weighted_total numeric(5,2)`, `prompt_hash`, `tokens_in`, `tokens_out`, `cost_usd`. **Source of truth for scores**; multiple rows per candidate (re-screenings).
- **`scoring_queue`** — `id`, `candidate_id`, `status scoring_job_status`, `attempts`, `last_error`, `enqueued_at`, `started_at`, `completed_at`, `next_retry_at`, `triggered_by`

#### Interviews
- **`interviews`** — `id`, `candidate_id`, `scheduled_at`, `duration_minutes`, `type`, `location`, `meeting_url`, `graph_event_id`, `created_by`, `status`, `notes`
- **`interview_interviewers`** — `(interview_id, user_id)` PK; many-to-many
- **`interview_reviews`** — `id`, `interview_id`, `reviewer_id`, `scores jsonb` (technical/soft/exp/culture/potential/attitude), `strengths`, `concerns`, `salary_proposed`, `recommendation`, `private_notes`. UNIQUE `(interview_id, reviewer_id)`.

#### Assessments
- **`assessments`** — `id`, `candidate_id`, `job_id`, `type` (file_upload v1, form v2), `title`, `instructions`, `test_file_path`, `submission_file_path`, `form_schema jsonb` (v2), `form_response jsonb` (v2), `time_limit_minutes`, `access_token uuid`, `status`, `sent_at`, `submitted_at`, `reviewed_at`, `reviewer_id`, `score`, `review_notes`, `expires_at`. Single-table design: v2 form builder slots in without migration.

#### Approvals
- **`approvals`** — `id`, `candidate_id`, `step_order int`, `actor approval_actor`, `assigned_to (FK profiles)`, `status`, `decided_by`, `decided_at`, `notes`, `payload jsonb` (proposed_salary, offer_terms). UNIQUE `(candidate_id, step_order)`. **One row per step** (deviation from PRD's single-row design — enables full history).

#### Email
- **`email_templates`** — `id`, `key UNIQUE`, `name`, `category`, `subject`, `body_html`, `variables jsonb`, `requires_approval boolean`, `is_active`, `created_by`
- **`email_logs`** — `id`, `candidate_id`, `direction`, `category`, `template_key`, `from_address`, `to_address`, `cc_addresses text[]`, `subject`, `body_html`, `body_preview` (200 chars), `graph_message_id`, `graph_conversation_id`, `status`, `error`, `attachments jsonb`, `sent_by`, `scheduled_for`, `sent_at`, `received_at`. UNIQUE INDEX on `graph_message_id WHERE direction='inbound'` for idempotency.
- **`scheduled_emails`** — `id`, `candidate_id`, `template_key`, `send_at`, `variables jsonb`, `status`, `sent_at`, `error`. Drained by cron every 5 min.

#### Notifications & meta
- **`notifications`** — `id`, `user_id`, `kind`, `payload jsonb`, `read_at`, `emailed_at`, `created_at`. INDEX on `(user_id, created_at DESC) WHERE read_at IS NULL`. Drives bell + digest emails.
- **`weight_templates`** — `id`, `role_family UNIQUE`, `weights jsonb`, `updated_by`, `updated_at`. Seeded with the 4 role-family defaults.
- **`activity_logs`** — `id`, `actor_id`, `entity_type`, `entity_id`, `action`, `diff jsonb`, `metadata jsonb`. INDEX on `(entity_type, entity_id, created_at DESC)` and `(actor_id, created_at DESC)`. Partition monthly when row count > 100K.

### 3.3 Triggers

```sql
-- updated_at on every table that has it
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
-- (apply to profiles, jobs, candidates, interviews, assessments, email_templates, email_logs, ...)

-- candidate stage change writes to activity_logs + bumps last_stage_changed_at
CREATE OR REPLACE FUNCTION track_stage_change() RETURNS trigger AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.last_stage_changed_at = now();
    INSERT INTO activity_logs(actor_id, entity_type, entity_id, action, diff)
    VALUES (auth.uid(), 'candidate', NEW.id, 'stage_changed',
      jsonb_build_object('from', OLD.stage, 'to', NEW.stage));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profile auto-provision on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'hiring_manager');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.4 Migration order

```
0001_enums.sql
0002_tables.sql
0003_indexes.sql
0004_triggers.sql
0005_rls.sql
0006_storage_policies.sql
0007_seed_defaults.sql      -- weight_templates, email_templates, departments
```

Apply via `mcp__supabase-matviet__apply_migration`. Mirror SQL to `supabase/migrations/` in the same PR. Run `generate_typescript_types` after each migration; commit `src/types/db.ts` in same PR.

---

## 4. Row Level Security

### 4.1 Helper functions (SECURITY DEFINER, avoids recursion)

```sql
CREATE OR REPLACE FUNCTION auth_role() RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_dept() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION can_see_job(j uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM jobs
    WHERE id = j AND (
      auth_role() IN ('admin','hr_staff')
      OR department_id = auth_dept()
      OR hiring_manager_id = auth.uid()
      OR EXISTS (SELECT 1 FROM job_assignments ja WHERE ja.job_id = j AND ja.user_id = auth.uid())
    )
  );
$$;
```

### 4.2 Policies (summary)

| Table | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| profiles | self OR admin/hr | admin only on others; user can update self (cannot self-promote role) |
| departments | any authenticated | admin only |
| jobs | admin/hr OR `department_id = auth_dept()` OR `hiring_manager_id = auth.uid()` OR job_assignments | admin/hr only |
| job_assignments | `can_see_job(job_id)` | admin/hr only |
| candidates | `can_see_job(job_id)` | admin/hr only (managers read-only on candidates) |
| ai_screenings | follows candidate via join | admin/hr only |
| interviews | follows candidate | admin/hr only |
| interview_interviewers | follows interview→candidate | admin/hr only |
| interview_reviews | follows interview | reviewer_id = auth.uid() OR admin/hr |
| assessments | follows candidate | admin/hr only |
| approvals | admin/hr OR assigned_to = auth.uid() OR can_see_job(via candidate) | assigned actor OR admin/hr |
| email_templates | any authenticated | admin/hr only |
| email_logs | admin/hr OR follows candidate | admin/hr only |
| scheduled_emails | admin/hr only | admin/hr only |
| notifications | self only (`user_id = auth.uid()`) | server-side admin (service role) creates; user can update read_at |
| weight_templates | any authenticated | admin/hr only |
| activity_logs | admin/hr only | any authenticated INSERT |

### 4.3 Storage bucket policies

Three private buckets:
- **`cvs`** — path `{candidate_id}/{filename}.pdf`. SELECT follows `can_see_job(via candidate)`. INSERT/UPDATE admin/hr only.
- **`assessments`** — path `{assessment_id}/test-*` or `submission-*`. Same pattern.
- **`avatars`** — path `{user_id}/avatar.jpg`. Public SELECT; INSERT/UPDATE only own path.

---

## 5. Project structure

```
matviet-hr/
├── public/
│   ├── brand/  (logo-primary, logo-white, logo-mono, logo-glyph .svg, og-image.png, apple-touch-icon.png)
│   ├── illustrations/  (empty-{candidates,jobs,pipeline,notifications,search}.svg)
│   ├── fonts/  (BeVietnamPro 400/500/600/700.woff2, JetBrainsMono 400/500.woff2)
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # root providers
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── callback/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                 # sidebar + topbar + role guard
│   │   │   ├── page.tsx                   # role-conditional: HR dashboard OR manager inbox
│   │   │   ├── jobs/                      # list, [new|edit|[id]|[id]/pipeline|[id]/approvals]
│   │   │   ├── candidates/                # pool table, [id] detail (3-column)
│   │   │   ├── interviews/                # calendar, today, [id] detail with review form
│   │   │   ├── approvals/page.tsx
│   │   │   ├── emails/                    # logs, templates/[id]
│   │   │   ├── tests/page.tsx             # v1 list; builder/ stub for v2
│   │   │   ├── reports/page.tsx
│   │   │   ├── referrals/new/page.tsx
│   │   │   ├── settings/                  # users, departments, templates, weights, integrations
│   │   │   └── admin/audit/page.tsx
│   │   └── api/
│   │       ├── scoring/{trigger,rescore}/route.ts
│   │       ├── graph/mail/{poll,send}/route.ts
│   │       ├── graph/calendar/event/[id]?/route.ts
│   │       ├── candidates/{upload,csv-import}/route.ts
│   │       ├── approvals/[id]/decide/route.ts
│   │       ├── reminders/interview-24h/route.ts
│   │       ├── scheduled-emails/drain/route.ts
│   │       ├── webhooks/libreoffice/route.ts
│   │       └── reports/{export-pdf,export-excel}/route.ts
│   │
│   ├── components/
│   │   ├── ui/                            # shadcn/ui
│   │   ├── layout/                        # Sidebar, TopBar, Breadcrumb, CommandMenu (⌘K)
│   │   ├── features/
│   │   │   ├── jobs/                      # JobForm, WeightsEditor, RoleFamilySelect, FlowTypeRadio, JobTable
│   │   │   ├── candidates/                # CandidateTable, CandidateCard, CvPreview, StageBadge, CandidateDetail
│   │   │   ├── pipeline/                  # KanbanBoard, StageColumn, PipelineFilters
│   │   │   ├── scoring/                   # ScoreCard, CriterionBar, EvidencePanel, ScoreBadge
│   │   │   ├── interviews/                # ScheduleDialog, CalendarView, ReviewForm, AggregateReview
│   │   │   ├── approvals/                 # ApprovalTimeline, DecisionBar, ApprovalInbox
│   │   │   ├── emails/                    # TemplateEditor, ComposeDialog, PreviewSendDialog, EmailLogTable
│   │   │   ├── assessments/               # AssessmentSendDialog, AssessmentDetail
│   │   │   ├── reports/                   # FunnelChart, TimeToHireChart, SourceEffectivenessChart, ScoreDistributionChart, ReportFilters
│   │   │   └── dashboard/                 # StatCard, PipelineFunnel, ActivityFeed, TodayInterviews, WaitForMeList
│   │   └── primitives/                    # Table (sortable/filterable/selectable), SlideOver, EmptyState, Skeleton, Toast
│   │
│   ├── lib/
│   │   ├── supabase/                      # client.ts, server.ts, admin.ts, types.ts, queries.ts
│   │   ├── ai/gemini/                     # client.ts, parse-cv.ts, score-cv.ts, prompts.ts, schemas.ts, cost.ts
│   │   ├── graph/                         # auth.ts, email.ts, calendar.ts, attachments.ts, errors.ts
│   │   ├── integrations/
│   │   │   ├── topcv/                     # csv-parser.ts, email-parser.ts, api-client.ts (Phase B stub), index.ts
│   │   │   └── careerviet/csv-parser.ts
│   │   ├── libreoffice/convert.ts         # calls Fly.io worker
│   │   ├── vietnam/                       # dateFormat.ts, currency.ts, relativeTime.ts, i18n.ts
│   │   ├── validation/schemas.ts          # zod schemas for all forms
│   │   └── utils/                         # cn.ts, ids.ts, debounce.ts
│   │
│   ├── server/
│   │   ├── scoring/                       # pipeline.ts, rubric.ts, weights.ts, evidence.ts
│   │   ├── automation/                    # email-triggers.ts, stage-hooks.ts, reminder-scheduler.ts
│   │   ├── approvals/                     # engine.ts, presets.ts, notifications.ts
│   │   ├── jobs/                          # service.ts, repository.ts
│   │   ├── candidates/                    # service.ts, repository.ts, ingestion.ts
│   │   ├── emails/                        # render.ts, dispatcher.ts, templates/*.tsx (React Email)
│   │   ├── notifications/                 # dispatcher.ts, digest.ts
│   │   └── audit/log.ts
│   │
│   ├── stores/                            # Zustand: sidebar, filters, commandMenu
│   ├── hooks/                             # useRole, useCandidates, useJobs, useInterviews, useKeyboardShortcuts
│   └── types/
│       ├── db.ts                          # generated by Supabase MCP — DO NOT EDIT
│       ├── domain.ts                      # shared TS types
│       └── env.ts                         # process.env typed
│
├── supabase/
│   ├── migrations/                        # 0001_enums.sql, 0002_tables.sql, 0003_indexes.sql, 0004_triggers.sql, 0005_rls.sql, 0006_storage_policies.sql, 0007_seed_defaults.sql
│   ├── functions/                         # Edge Functions (score-candidate, etc.)
│   └── seed.sql                           # production seed (weight_templates + email_templates + 1 default department)
│
├── libreoffice-worker/                    # Fly.io deploy
│   ├── Dockerfile
│   ├── server.js
│   └── package.json
│
├── tests/
│   ├── e2e/                               # Playwright (login, create-job, upload-cv, schedule-interview, approve-offer)
│   ├── visual/                            # screenshot-on-failure outputs
│   └── unit/                              # Vitest
│
├── scripts/
│   ├── seed.ts                            # deterministic Faker dev data
│   └── verify-deliverability.ts           # mail-tester.com submission helper
│
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── tailwind.config.ts
├── next.config.mjs
├── netlify.toml
├── package.json
├── README.md
└── CLAUDE.md
```

---

## 6. State management

- **Server state:** React Query v5. Keys: `['jobs', filters]`, `['candidates', jobId, filters]`, `['candidate', id]`, `['interviews', dateRange]`, `['approvals', 'pending']`, `['activity', scope, id]`. Mutations use optimistic updates where safe.
- **UI state:** Zustand stores — sidebar collapsed, filter drafts (before apply), command menu open/closed.
- **URL state:** filter state (status, department, date range, search) serialized to query params via `nuqs` — shareable URLs, back/forward work.
- **Form state:** react-hook-form + Zod resolvers.

---

## 7. Auth & authorization

- **Supabase Auth** with email/password + magic link (admin invite).
- **Row level:** RLS enforces per-role + per-department + per-assignment access.
- **JWT claim:** `role` injected via Supabase custom claim (trigger on profile update).
- **Client route guard:** `(dashboard)/layout.tsx` Server Component fetches session; redirects to `/login` if missing.
- **Server API guard:** every `/api/*` route calls `getServerSession()` and checks role before proceeding.
- **Admin-only routes:** `/settings/*`, `/admin/*` — guarded on layout.

### Session + lockout policy
- 8-hour inactivity timeout
- Refresh token rotation enabled
- 5 failed logins / 15min per IP+email → 1h lockout (admin override)
- Password reset via Supabase magic link

---

## 8. Environments & test data

```
PRODUCTION
  Supabase: matviet-hr (xeyqbapegqeibeqrwnkm), Pro plan, ap-southeast-2
  Netlify:  hr.matviet.com.vn (production, main branch)

PREVIEW (per PR)
  Supabase: production project; ephemeral DB branch via `mcp__supabase-matviet__create_branch` for PRs touching candidates/applications/interview_reviews/email_logs/approvals
  Netlify:  <branch>--matviet-hr.netlify.app (auto)

LOCAL DEV
  Next.js:  npm run dev (http://localhost:3000)
  DB:       Supabase CLI local stack OR ephemeral branch
  Seed:     scripts/seed.ts (Faker, deterministic with fixed seed 'matviet-hr-2026')
```

### Dev seed contents
- 3 users (admin Sanh, hr_staff Hương, hiring_manager test)
- 3 departments (Bán hàng, Kỹ thuật quang học, Văn phòng)
- 5 jobs (one per role family + one closed)
- 30 candidates (5 with synthetic CVs, 25 text-only)
- AI screenings pre-populated for the 5 with CVs
- 3 future + 2 past interviews
- 2 candidates mid-approval-flow

### Production seed (`supabase/seed.sql`)
- 4 weight templates (one per role family)
- 7 email templates (Vietnamese — see `docs/content/email-templates.md`)
- Initial department list from Mắt Việt org chart

---

## 9. Performance & limits

| Concern | Target | Mechanism |
|---|---|---|
| Page load | < 2s p95 | Next.js RSC, cached queries, skeleton loaders |
| AI scoring | < 60s/CV | Async queue, parallel parse+score, retry with backoff |
| API p95 | < 500ms | DB indexes, server caching |
| Bundle size | < 250KB initial | Tree-shaking, dynamic imports for charts |
| Hard limits | CV 10MB, body 50KB, candidates/job 500, concurrent uploads 5 | Validated server-side |
| Cost guardrails | Gemini $5/day soft, $25/day hard | `cost_meters` table + scheduled function |

---

## 10. Logging & observability

- **Sentry:** error tracking, breadcrumbs include user role + route. Performance traces on key paths.
- **Better Stack:** uptime monitoring (3-min interval) + log retention.
- **Activity logs:** mutations write to `activity_logs` (queryable from admin audit page).
- **Cost tracking:** `ai_screenings.cost_usd` + daily aggregate in `cost_meters`. Dashboard shows monthly Gemini spend.
- **Build log:** `docs/build-log.md` — chat-time decisions, surprises, migration notes.

---

## 11. Security baseline

- Pre-commit hook (Husky): `gitleaks` + `eslint --fix` + `tsc --noEmit` + `prettier --check`
- CI on every PR (GitHub Actions): typecheck, Vitest, Playwright on chromium, axe-core on 5 critical pages
- CSP: strict per route; defined in `next.config.mjs` + `middleware.ts`. `script-src 'self'` baseline.
- CV virus scan: **accept-the-risk** for v1 (internal HR tool, low blast radius)
- Auth: 8h session timeout, refresh token rotation, 5/15min rate limit
- CSRF: Next.js Server Actions handle natively; API routes have explicit token check
- Secrets: `.env.local` git-ignored; pre-commit gitleaks scan

---

## 12. Cross-references

- Master plan: `~/.claude/plans/mutable-crunching-coral.md` — full v5.0
- Integrations details (Gemini, Graph, TopCV, CareerViet): `docs/integrations.md`
- API route handlers: `docs/api.md`
- UI/UX (design system, page specs): `docs/ui-ux.md`
- Decisions: `docs/decisions/000N-*.md`
