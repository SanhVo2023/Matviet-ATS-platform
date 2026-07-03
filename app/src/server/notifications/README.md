# notifications — in-app bell + Web Push

Notification center for the ≤5 internal users. Two layers:

1. **In-app rows** (`notifications` table) — the TopBar bell
   (`components/layout/NotificationBell.tsx`) polls `GET /api/notifications`
   every 60s + on tab refocus and renders the dropdown (unread badge,
   mark-read, per-item deep link).
2. **Web Push** (`push_subscriptions` table) — covers the closed-tab case.
   Opt-in per browser from the bell footer. Pushes are **payload-free** on
   purpose: an empty POST needs only the VAPID ES256 JWT (WebCrypto,
   `push.ts`), not RFC 8291 payload encryption. The service worker
   (`public/sw.js`) reacts by fetching `/api/notifications` with its session
   cookie and shows the newest unread item.

## Files

| File            | What                                                                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repository.ts` | notification CRUD, role fan-out targets, push-subscription CRUD                                                                                                                                           |
| `service.ts`    | `notifyUsers` / `notifyRoles` / `jobManagerIds` (all swallow errors — a failed notification must never fail the business action) + `runNotificationSweep` (interview reminders ≤60 min out, 60-day prune) |
| `push.ts`       | VAPID JWT signing + payload-free push fan-out; 404/410 → subscription deleted                                                                                                                             |

## Emitters (who gets told what)

| Event                               | Where                   | Targets                                                                                                             |
| ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Scoring done / final failure        | `scoring/worker.ts`     | hr + admin                                                                                                          |
| Approval step pending               | `approvals/engine.ts`   | step owner: hr steps → hr+admin; manager step → job-assigned managers (fallback hr+admin); bod/tap_doan → that role |
| Approval finalized (offer / reject) | `approvals/engine.ts`   | hr + admin, excluding the deciding actor                                                                            |
| Interview scheduled                 | `interviews/service.ts` | attendees, excluding the scheduler                                                                                  |
| Interview starting ≤60 min          | cron sweep              | attendees + creator (deduped via `idx_notifications_dedup`)                                                         |
| Outbound email dead-lettered        | `email/sender.ts`       | hr + admin                                                                                                          |

## Routes

- `GET /api/notifications` — `{unread, items, pushKey}` (401 JSON, no redirect — polled by client + SW)
- `POST /api/notifications/read` — `{ids?}` or mark-all
- `POST|DELETE /api/notifications/subscribe` — push subscription upsert/remove
- `GET /api/notifications/cron` — CRON_SECRET-gated sweep (wired in `custom-worker.ts` CRON_ROUTES)

## Config

`VAPID_PUBLIC_KEY` + `VAPID_SUBJECT` (wrangler vars), `VAPID_PRIVATE_KEY`
(secret). Missing keys → push silently disabled, in-app bell still works.
Rotating the pair invalidates every existing browser subscription.
