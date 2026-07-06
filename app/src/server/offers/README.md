# offers — accept/decline magic link (G12, ADR 0014)

One active offer token per candidate, stored on `candidates`
(`offer_token`, 7-day expiry). The token IS the authorization — same
philosophy as assessment invites.

- `getOrCreateOfferToken(candidateId)` — reuses the live token while
  unanswered, else mints a new one. Called automatically by
  `composeFromTemplate` when the `offer` template is queued, which injects
  `{{offer_link}}` server-side (the composer shows "tạo tự động khi gửi").
- `getOfferByToken` / `respondToOffer` — power the public
  `/nhan-viec/[token]` page (`OfferResponseCard`) via `POST /api/offer/respond`.
  Accept → stage `hired` (+ optional `expected_start_date`); decline →
  `rejected` (+ optional `offer_response_note`). Both write `stage_history`
  (actor null) and raise an `offer_response` notification to hr+admin.
  Idempotent: double-submits and revisits return the recorded outcome.

`offer_response` distinguishes offer-declines from ordinary rejections for
reporting. The accept event is the designated Group 13 onboarding trigger.
