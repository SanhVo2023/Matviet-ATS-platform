# ADR 0021 — Collapse the pipeline from 16 stages to 8; derive sub-state

**Status:** accepted (2026-09-07, renovation R1)
**Supersedes parts of:** ADR 0019 (the ladder keeps its 4 groups; the underlying
stage count changes)

## Context

The end-to-end audit (2026-09-07) found the 16-stage pipeline carried far more
states than meaning. Roughly half the stages were dead (`salary_deal` created
by nothing), ghost (`offer_accepted` unreachable — offer-accept jumped straight
to `hired`), or micro-distinctions the UI collapsed anyway (the kanban already
showed 4 business groups). Worse, several server flows (approvals, interviews,
assessments) moved `current_stage` **without** writing `stage_history`, which
silently corrupted the journey timeline, the reports funnel, and the agent's
staleness detection. The stage enum also lived in 4 unlinked copies.

## Decision

Collapse to **8 stages**: `intake`, `evaluating`, `approving`, `offer`,
`offer_accepted`, `hired`, `rejected`, `withdrew`. The fine-grained situation
(AI scoring, which interview/test, which approval step, offer sent-vs-answered)
becomes **derived sub-state** computed by `deriveCandidateStatus()` from related
rows — not encoded in a micro-stage.

- **Single source of truth:** `src/lib/stages.ts` (enum + `ALLOWED_TRANSITIONS`
  guard + `LEGACY_STAGE_MAP`). Every other list re-exports from it.
- **Every stage write goes through `transitionStage()`** (guard + required
  reject reason + `stage_history` + auto-cancel of a pending approval chain when
  leaving `approving`). This kills the drag-out-of-approval trap and the
  orphaned-pending-step bug, and makes the journey/funnel/agent honest.
- **`offer_accepted` is now real:** candidate accept → `offer_accepted`; HR
  explicitly confirms → `hired`.
- **`rejected` carries a required `rejection_reason`** (screened_out /
  not_approved / offer_declined / withdrawn_by_us / other) so an offer decline,
  a screen-out, and a not-approved never collapse into one "Từ chối".
- Migration `0008` maps existing candidate + stage_history rows, drops
  now-degenerate history rows, and backfills reasons.

## Consequences

- Reports funnel drops the `screening` super-stage (`intake` IS applied);
  conversion pairs shrink from 13 to 5. A candidate taking the intake→approving
  skip path reads slightly low on the evaluating conversion — accepted.
- Scoring and grading no longer move the stage; `ai_screening_status` and the
  submissions rows are the sub-state.
- Kanban/table/journey/dashboard all render one `DerivedStatus`
  (waiting-on + days-waiting), so "who holds the ball, for how long" is
  consistent everywhere.
