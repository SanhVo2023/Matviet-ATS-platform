# ADR 0014 — Candidate-facing surfaces (Group 12) & the build/buy boundary

**Date:** 2026-07-06 · **Status:** Accepted · **Owner:** Sanh Võ (greenlit in chat)

## Context

All candidate intake was manual (HR upload or job-board CSV) and the offer step
was an untracked "please reply" email. Sanh asked for a debate on what a
candidate system should have and how the app expands toward onboarding
(ADR 0012 direction). Group 12 was greenlit as the first slice.

## Decision

1. **Public careers surface** at `/tuyen-dung` (list + detail + apply form) on
   the production domain. Applications create candidates with
   `source='careers_page'`, auto-enqueue AI scoring, auto-send the
   `receipt_ack` template, and raise a `candidate_new` bell/push notification.
   A printable **QR poster** per job (`/tin-tuyen-dung/[id]/qr`) turns store
   windows into a hiring channel.
2. **Offer magic link**: `composeFromTemplate('offer')` mints a 7-day opaque
   token (same philosophy as assessment invites — the token IS the auth) and
   injects `{{offer_link}}` server-side. The public `/nhan-viec/[token]` page
   records accept (→ stage `hired`, optional preferred start date) or decline
   (→ `rejected`, optional reason) in `offer_response`, so reports can tell
   offer-declines from ordinary rejections. This click is the future trigger
   for onboarding (Group 13).
3. **Anti-abuse without a captcha service**: honeypot field + minimum
   fill-time (3s) in the API route, 5 applications/hour/IP, duplicate block on
   (job, email|phone). Deliberately no Turnstile yet — add only if real spam
   appears.
4. **PDPD compliance** (Nghị định 13/2023/NĐ-CP): required consent checkbox on
   the apply form, stored as `candidates.consent_at`.
5. **Build/buy boundary for the employee-management expansion**: we own
   **hire-to-contract** (recruiting, offer, onboarding checklists, probation
   per Bộ luật Lao động 2019 Điều 25, contract records). We will **never
   build** payroll, BHXH/PIT filings, or hardware timekeeping — those stay
   with the accounting stack (MISA/accountant) and existing chấm công
   machines; we export employee master data for them instead.

## Consequences

- Candidates no longer need accounts anywhere — magic links + email remain the
  only candidate interaction model (re-affirms the PRD scope decision).
- The roadmap ahead: Group 13 = onboarding MVP (candidate→employee conversion,
  checklists, document-collection links, probation reminders), Group 14 =
  talent pool + referrals (person-level identity across jobs already exists
  via `people`).
- Public routes are listed in `middleware.ts` PUBLIC_ROUTES; the apply
  endpoint bypasses `requireRole` by design and carries its own defenses.
