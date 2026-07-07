# apply — public careers-page intake (G12, ADR 0014)

Candidate-facing application flow: `/tuyen-dung` (list) → `/tuyen-dung/[id]`
(detail + `ApplyForm`) → `POST /api/apply` (multipart) → `submitPublicApplication`.

What a successful submission does, in order:

1. rate-limit check (5/h/IP via `source_meta.ip`) + duplicate block (same
   job + email|phone, friendly Vietnamese error)
2. `uploadCandidateWithCv(..., null, {consent_at, source_meta})` — same code
   path as HR uploads; `source='careers_page'`
3. `enqueueScoring` + queue fast-path trigger (AI scores it within ~a minute)
4. `receipt_ack` template auto-queued to the candidate (requires_approval=0)
5. `candidate_new` bell/push notification to hr+admin

Anti-abuse lives in TWO layers: the API route (honeypot `website` field +
`opened_at` minimum fill time of 3s — both answer fake success) and this
service (rate limit + dup). No captcha by design — see ADR 0014.

The printable QR poster (`/vi-tri/[id]/qr`, `QrPoster.tsx`) deep-links
to the public detail page; dashboard chrome is `print:hidden` so
`window.print()` emits only the poster.
