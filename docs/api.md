# Internal API — Mắt Việt HR

Master plan reference: PART VI

All routes are Next.js Route Handlers under `src/app/api/*`. Authenticated via Supabase session cookie (`@supabase/ssr`). JSON request/response.

**Standard error shape:**
```json
{ "error": { "code": "VALIDATION", "message": "Trọng số phải cộng lại bằng 100%." } }
```

---

## 1. Authentication-protected routes

### Candidate ingestion
- `POST /api/candidates/upload` — multipart `file` (PDF/DOCX) + `job_id`. Returns `{candidate_id}`. **Async**: enqueues scoring job, returns immediately.
- `POST /api/candidates/csv-import` — multipart CSV + `job_id` + `source`. Returns `{imported, skipped, errors[]}`.

### Scoring
- `POST /api/scoring/trigger` — `{candidate_id}`. Manually re-queue scoring (e.g., after fix).
- `POST /api/scoring/rescore` — `{candidate_id}`. Force full re-call of Gemini (used after model upgrade or `criteria_config.keywords` change). Bumps `ai_screening_status='pending'` and enqueues.

### Email
- `POST /api/graph/mail/send` — `{template_key, candidate_id, variables, attachments?}`.
  - If template's `requires_approval=true` AND caller is not in approval context → returns rendered HTML preview instead of sending.
  - With approval context (preview-then-send modal flow): actually sends via MS Graph.
- `POST /api/emails/preview` — `{template_key, variables}`. Returns rendered HTML for preview pane.

### Calendar
- `POST /api/graph/calendar/event` — `{candidate_id, start, end, duration, interviewer_ids, type, location?, teamsLink?, notes?}`. Creates Outlook event + `interviews` row. Returns `{interview_id, teams_url?}`.
- `PATCH /api/graph/calendar/event/[id]` — reschedule (`{newStart, newEnd}`).
- `DELETE /api/graph/calendar/event/[id]` — cancel.

### Approvals
- `POST /api/approvals/[id]/decide` — `{decision: 'approved'|'rejected', notes?, payload?}`. Advances workflow; emails next actor or HR (on reject).

### Assessments
- `POST /api/assessments/send` — `{candidate_id, assessment_id}`. Generates secure signed Storage URL (48h expiry); emails candidate via Graph.
- `POST /api/assessments/[id]/submission` — multipart `file`. HR uploads candidate's emailed-back answer.
- `POST /api/assessments/[id]/score` — `{score, review_notes}`.

### Reports
- `POST /api/reports/export-pdf` — `{date_from, date_to, filters}`. Returns PDF buffer (`@react-pdf/renderer`).
- `POST /api/reports/export-excel` — same, returns `.xlsx` (exceljs).

### Notifications
- `PATCH /api/notifications/[id]/read` — mark single notification read.
- `POST /api/notifications/mark-all-read` — bulk.

### Search
- `GET /api/candidates/search?q=` — Postgres FTS on `cv_raw_text` + trigram on name/email. Used by `⌘K` command palette.

---

## 2. Scheduled (Netlify Cron)

All scheduled routes protected by `CRON_SECRET` header.

- `GET /api/graph/mail/poll` — every 5min. Polls hr@ inbox for new CV emails.
- `GET /api/reminders/interview-24h` — every hour. Finds interviews scheduled 22-26h from now; sends reminders if not already.
- `GET /api/scheduled-emails/drain` — every 5min. Drains `scheduled_emails` table for due-now sends.
- `GET /api/scoring-queue/process` — every 1min. Drains `scoring_queue` (pending or retry-due jobs); spawns Gemini calls.
- `GET /api/notifications/digest` — daily at 8am UTC+7. Generates off-hours digest email per user.
- `GET /api/cost-meters/check` — daily at 00:00 UTC+7. Tallies daily Gemini cost; trips soft/hard alerts.
- `GET /api/maintenance/cleanup` — daily. Drops `scoring_queue` entries > 30d completed; `scheduled_emails` > 90d sent.

`netlify.toml`:
```toml
[[plugins]]
  package = "@netlify/plugin-scheduled-functions"

[[functions.schedule]]
  function = "graph-mail-poll"
  schedule = "*/5 * * * *"
[[functions.schedule]]
  function = "reminders-24h"
  schedule = "0 * * * *"
[[functions.schedule]]
  function = "scheduled-emails-drain"
  schedule = "*/5 * * * *"
[[functions.schedule]]
  function = "scoring-queue-process"
  schedule = "* * * * *"
[[functions.schedule]]
  function = "notifications-digest"
  schedule = "0 1 * * *"   # 08:00 Asia/Ho_Chi_Minh = 01:00 UTC
[[functions.schedule]]
  function = "cost-meters-check"
  schedule = "0 17 * * *"  # 00:00 Asia/Ho_Chi_Minh = 17:00 UTC previous day
[[functions.schedule]]
  function = "maintenance-cleanup"
  schedule = "0 18 * * *"  # 01:00 Asia/Ho_Chi_Minh
```

---

## 3. Webhooks

- `POST /api/webhooks/libreoffice` — DOCX worker callback. `{job_id, pdf_url, error?}`. Verified via `X-Worker-Secret`.
- `POST /api/webhooks/topcv` — (Phase B) TopCV pushes new applications. Authenticated via signature from TopCV.

---

## 4. System health & integration tests

Admin-only routes:
- `GET /api/health` — `{db, graph, gemini, libreoffice, fly}` status. Used by Better Stack monitor.
- `GET /api/settings/integrations/graph/ping` — admin-only. Lists 1 message from inbox + sends test email.
- `GET /api/settings/integrations/gemini/ping` — admin-only. Tiny prompt test call; returns latency + cost.
- `GET /api/settings/integrations/libreoffice/ping` — admin-only. Sends a fixture DOCX; expects PDF back.

---

## 5. Server-side guards

Every `/api/*` route follows this pattern:

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { getSession, requireRole } from '@/lib/auth'

export async function POST(req: Request) {
  const supabase = createServerClient()
  const session = await getSession(supabase)
  if (!session) return new Response('Unauthorized', { status: 401 })

  // Optional role gate:
  // requireRole(session, ['admin','hr_staff'])

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: { code: 'VALIDATION', message: parsed.error.message } }, { status: 400 })
  }

  // ... business logic, RLS-aware queries via supabase client
}
```

Server-only operations (e.g., post-scoring writes) use the service-role client `createAdminClient()` from `src/lib/supabase/admin.ts`. **Never expose service role key to the browser.**

---

## 6. Rate limits & abuse

- File uploads: max 5 concurrent per user (queue rest)
- Scoring trigger: 30/min per user (HR shouldn't bulk-thrash)
- Email send: 30/min global (Graph throttle)
- Auth login: 5/15min per IP+email (Supabase Auth handles)

Implemented via Upstash Redis or simple in-memory token bucket (acceptable at our scale). Documented in module READMEs.

---

## 7. Cross-references

- Architecture: `docs/architecture.md`
- Integrations: `docs/integrations.md`
- Schedules above mirror `docs/runbook.md` cron list
