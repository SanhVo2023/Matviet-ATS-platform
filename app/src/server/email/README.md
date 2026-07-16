# `src/server/email`

Outbound email pipeline. G6 turns the `email_messages` queue (filled by G9 today, G7/G8 later) into actual mail.

**Transport (since 2026-07-03): Cloudflare Email Service first, MS Graph fallback.**
The matviet.com.vn zone is onboarded to Email Sending (SPF/DKIM on
`cf-bounce.matviet.com.vn`); the Worker sends via the `send_email` binding
(`EMAIL` in wrangler.jsonc) from `EMAIL_FROM_ADDRESS` (default
`hr@matviet.com.vn`). Inbound mail stays on the company's Google Workspace MX
— do **not** enable Cloudflare Email Routing on this zone, it would replace
the Google MX records. Replies to the from-address land in Google Workspace.

## Files

- `templates.ts` — `renderTemplate(string, vars)` does `{{var}}` substitution + HTML escape. `loadTemplate(code)` reads `email_templates`. `renderFromTemplate(code, vars)` does both.
- `repository.ts` — typed wrapper around `email_messages` for the queue worker + composer + queue page.
- `transport.ts` — `deliverMail(input)`: Cloudflare `send_email` binding when present, else MS Graph. Shared by the queue worker and better-auth password reset. Wraps every body in the branded shell (`layout.ts`) and derives the plain-text alternative from the pre-wrap body.
- `layout.ts` — pure string builders: `brandEmailHtml` (navy+gold table-based shell, inline styles, idempotent — full `<html>` docs pass through untouched), `emailCtaButton`, `htmlToText`. DB templates stay content-only `<p>` HTML; the shell owns the chrome, so the composer's live preview shows content-only too.
- `sender.ts` — `sendOne(message)` and `drainQueue(limit)`. Handles retry classification (`auth | throttle | permanent | transient`); Cloudflare `E_*` codes are mapped onto the same taxonomy in `src/lib/email/cloudflare.ts`. Dead-lettered messages raise an `email_failed` bell notification for hr+admin.
- `service.ts` — high-level: `composeFromTemplate`, `composeAdHoc`, `approveAndQueue`, `sendNow`, `manualRetry`, `cancel`.

## Send pipeline

```
caller (server action)
  └─ service.composeFromTemplate(...)
       ├─ templates.renderFromTemplate(code, vars)
       └─ repository.enqueueOutbound(rendered)
            └─ inserts email_messages(status='queued' | 'pending_approval')

cron mỗi phút (Cloudflare Cron Trigger) → /api/emails/drain
  └─ sender.drainQueue(10)
       └─ for each row: sender.sendOne(row)
            ├─ lib/graph/email.sendMail(...) → Graph 202 / 401 / 429 / 5xx
            ├─ on 200/202 → repository.markSent(id)
            ├─ on 429/5xx (retriable) → repository.bumpRetry(id, +1, +backoff)
            └─ on 401/4xx/permanent → repository.markFailed(id, msg)
```

## Retry policy

| kind        | source           | action                                                     | terminal?            |
| ----------- | ---------------- | ---------------------------------------------------------- | -------------------- |
| `auth`      | 401, 403         | `failed` immediately                                       | yes                  |
| `throttle`  | 429              | `next_retry_at = now + Retry-After`, status stays `queued` | no, up to 3 attempts |
| `transient` | 5xx, network     | exponential backoff 1m / 5m / 15m                          | no, up to 3 attempts |
| `permanent` | 400, parse, etc. | `failed` immediately                                       | yes                  |

After 3 attempts on a retriable error, the row is `failed`. HR can click "Thử lại" → resets `retry_count=0`, flips back to `queued`.

## Why no Graph message id on outbound

`POST /users/{mailbox}/sendMail` returns 202 with no body. The Graph SDK doesn't expose the resulting message id from a Sent Items record. We accept this — `email_messages.graph_message_id` stays null on outbound until G6.5's inbox poller matches the Sent Items row by `internetMessageId` (rarely needed; only for thread reconstruction).

For replies, the proper path is `POST /users/{mailbox}/messages/{id}/reply` which requires the Graph id of the inbound message we're replying to. That code path lives in `lib/graph/email.ts` (`sendMail({replyToMessageId})`) and gets exercised once G6.5 lands.

## Pending approval flow

Three of the seeded templates carry `requires_approval = true`:

- `interview_invite` — manager + HR see the candidate; want a sanity check before sending.
- `offer` — has salary; legal/BOD review by default.
- `rejection` — soft-touch wording; HR head double-checks.

Composer queues these as `status='pending_approval'`. They sit in the queue until an HR/admin clicks "Phê duyệt" (calls `approveAndQueue`). The drain worker only picks `status='queued'` rows.

## Operational defaults

- `SEND_MAX_ATTEMPTS = 3`
- Drain batch size: 10 (cron fires every 5 min, so realistic burst ~120/hour ceiling, far above the 5/day projection).
- Sequential send, not parallel — at <5 emails/day there's nothing to win, and Graph rate-limits per app.
- All sends are logged in `email_messages`. There's no separate `email_logs` table; the integrations doc's older naming has been reconciled to `email_messages`.

## Not in v1 (intentional)

- React Email v3 component templates. The 7 seeded templates are plain-HTML strings in `email_templates.body_html`; converting them to React Email components is a future polish task — not blocking the IT-bundle unblock.
- Inbound poller (Mail.Read + classify + match by `internetMessageId` / `In-Reply-To`). Lands in G6.5.
- Bounce / DSN handling. SPF/DKIM/DMARC must be set up by IT (see `docs/integrations.md` §2.4) before bounces become rare enough to ignore at our scale.
- Per-user rate limit. `≤5 outbound emails/day` per CLAUDE.md is a workload projection, not a check.
- Calendar invites — that's G7.
