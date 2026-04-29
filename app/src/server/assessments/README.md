# `server/assessments`

Bài test (test send / receive / grade) module — Group 9.

## Lifecycle

1. **HR uploads test file per job** (`/cai-dat/bai-test/[jobId]`). The job has at most one `is_active=true` assessment at a time; uploading a new test deactivates the previous one.
2. **HR clicks "Gửi bài test"** on a candidate's detail page. `sendAssessment()`:
   - Generates a 32-byte (256-bit) base64url token, expires in 48 hours.
   - Inserts `assessment_invite_tokens` (admin client; table is service-role-only).
   - Inserts a placeholder `assessment_submissions` row keyed on (candidate, assessment) — unique index enforces one-per-pair.
   - Renders the `assessment_send` email template with `{{download_link}} = ${appUrl}/test/${token}`.
   - Inserts an `email_messages` row with `status='queued'`. **G6 (when IT delivers M365) will flush queued rows.** Until then HR uses the "Sao chép link" button on the dialog to paste the link into Outlook manually.
   - Bumps `candidates.current_stage` to `test_sent` if currently earlier.
3. **Candidate opens `/test/[token]`** (public, no auth). Server reads via `getActiveInviteToken()` (admin client). Uploads PDF → `recordSubmission()` writes to `submissions/<submission_id>/answer-<slug>.pdf`, marks token `used_at`.
4. **HR grades** via `gradeSubmission()` — score 0–100 + notes. Stage auto-advances to `test_done` if currently `test_sent`.

## Why service-role-only RLS on `assessment_invite_tokens`

Tokens grant write access to a public Storage bucket. They must not be:

- listable from the client (RLS denies authenticated select)
- readable by any role other than service (the public submission route is the only legitimate consumer, and it runs server-side)

The table has RLS enabled with **no policies** — admin client bypasses, every other role gets nothing. Documented in migration 0017.

## Storage layout

```
assessments/<assessment_id>/test-<slug>.pdf      # HR uploads
submissions/<submission_id>/answer-<slug>.pdf    # candidate uploads
```

Both buckets are private (created in migration 0009). Read access goes through `signTestUrl()` / `signSubmissionUrl()` (30-min TTL).

## Email template fallback

`email_messages` row gets `status='queued'`. The module substitutes `{{...}}` placeholders directly using the seeded `email_templates.body_html` (Handlebars-ish, escape-on-substitute). When G6 ships React Email rendering, it will read the same queued rows and re-render server-side — the queue rows are forward-compatible.
