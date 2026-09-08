# ADR 0024 — Agent reconcile train: truth-based nightly backstop + daily catch-up marker

- **Status:** Accepted (2026-09-08)
- **Extends:** ADR 0020 (agent-driven hiring, propose-first), ADR 0023 (HRM system of engagement)

## Context

The 2026-09-08 agentic-pipeline audit found that the propose-first machinery had a fast lane
only: pipeline events and per-job Durable Object alarms. Anything that fell through — a lost
alarm, an event emitted right before a deploy, a row edited by hand, an `offer_accepted`
candidate nobody confirmed, a failed scoring nobody retried, an approval chain left pending
after a manual stage move — stayed silent forever. The same audit found three latent races /
gaps: `createProposal` was check-then-insert (two generators could open twin cards), the
scoring claim-time guard checked the admin kill switch but not the cost breaker, and the HRM
compliance sweep was gated to the literal 01:00 UTC cron minute (a missed tick skipped the day).

## Decision

1. **Reconcile, don't just react.** `server/agent-flows/reconcile.ts` walks live D1 once a day
   and proposes whatever the fast lane missed, through the SAME generators and dedupe keys, so a
   healthy day proposes nothing. It adds three candidate-bound kinds:
   `confirm_hire` (also event-driven), `retry_scoring` (dedupe by attempt count; manual hint
   after 3), `orphan_approval`; re-runs `sweepCandidate` for every watched stage; supersedes
   open cards on archived candidates.
2. **Once per Vietnam day, with catch-up.** `daily.ts` runs the HRM compliance sweep and the
   hiring reconcile behind a settings marker (`agent_last_daily_sweep` = VN date). The cron pokes
   `/api/agent/daily` every minute after 01:00 UTC; the marker makes it idempotent, and a run
   that throws clears the marker so the next minute retries. No more minute-exact gates.
3. **Dedupe is a DB guarantee.** Partial unique index `uq_proposals_open_dedupe`
   (`dedupe_key WHERE status IN ('proposed','approved')`, migration 0014 with a one-time twin
   cleanup); `createProposal` treats the UNIQUE error as "skip".
4. **Preflight before acting.** `executeProposal` refuses a card whose candidate has moved to a
   stage the kind does not fit (`VALID_STAGES_BY_KIND`, exported from `events.ts`), failing it
   with a plain Vietnamese reason instead of running a stale action.
5. **One AI gate.** `server/ai/availability.ts` `aiAvailability()` (kill switch + cost breaker,
   with a reason) is used by both the inference runtime and the scoring claim-time guard.
6. **A run log the admin can read.** `proposalStats()` + `AgentHealthCard` on
   `/cai-dat/he-thong`: cards by kind/status over 30 days, acceptance rate, oldest open card,
   recent failures.

## Consequences

- The DO stays a disposable timer hint; D1 remains the single system of record (ADR 0020 rule
  preserved). Reconcile cost is a few hundred cheap queries per day.
- HRM writes stay propose-first; the chat assistant gained read-only HRM tools only.
- Prod needs migration 0014 (additive; the cleanup UPDATE is a no-op on healthy data).
- Not done: the chat agent's own mutations are still confirm-in-chat rather than feed cards
  (audit "chat agent propose-first"); Fastwork/ESS remain deferred (D-FW, D-ESS).
