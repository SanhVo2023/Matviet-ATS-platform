# agent-flows — agent-driven hiring, propose-first (ADR 0020)

The process brain of the app. Pipeline events and per-job Durable Object
timers turn into **fully-prepared action proposals** (`agent_proposals`
table) that a human approves/edits/dismisses on the "Hôm nay" feed. Executing
a proposal goes through the SAME server services a manual click uses.

## Architecture

```
emitters (scoring worker, evaluations, approvals, offers, stage moves)
   └─ emitAgentEvent / emitAgentEventInBackground  (events.ts)
        ├─ reconcileOpenProposals   — supersede cards the event invalidated
        ├─ generators.ts            — create the next proposal (deterministic)
        └─ pingHiringAgent          — (re)arm the DO stale timer (agent-link.ts)

HiringAgent DO (src/agents/hiring-agent.ts, one per job)
   └─ alarm → SELF service binding → /api/agent/sweep → sweep.ts
        └─ candidate genuinely idle? → nudge_stale proposal

feed UI → execute.ts (executeProposal) → existing services
                                        → audit_log via:'agent_proposal'
```

Design rules:

- **D1 is the single system of record.** The DO holds only timers + a watch
  hint; it is disposable and re-armed by the next event.
- **The DO runs zero business logic** — it can't even read D1. Stage
  semantics (which stages are watched, for how long) live in `events.ts` /
  `sweep.ts` (Next ctx).
- **The Next bundle never imports the `agents` package** (webpack can't
  bundle `cloudflare:*` schemes) — agent-link.ts talks to the DO through the
  raw stub's `fetch()` and the agent's `onRequest` surface.
- **No AI in the deterministic generators.** Only `job_from_intent`
  generates content (intent parse + JD); everything else assembles data the
  system already has. AI usage is tagged `agent_job_intent`.
- Generators/emitters never throw into their callers (same contract as
  notifications).

## Proposal kinds (v1 — core five)

| kind               | trigger                                                | approve executes                                                           |
| ------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `interview_invite` | scoring ≥ 55 at `screened` (auto or manual move)       | `scheduleInterview` + invite email (forceImmediate) + ambient AI questions |
| `start_approval`   | evaluation submitted, no approval flow yet             | `startApproval`                                                            |
| `compose_offer`    | approval fully approved (or manual move to offer_sent) | card opens composer (offer template); executes once the offer email exists |
| `nudge_stale`      | DO timer + sweep confirms idle ≥ threshold             | reminder email to candidate (test_sent/offer_sent) or internal bell        |
| `job_from_intent`  | command-bar sentence                                   | `createJobWithAssignments(..., "open")`                                    |

Dedupe: `dedupe_key` (`ii:`/`sa:`/`co:`/`ns:<id>:<stage>`/`jfi:<uuid>`);
open/approved/executed/dismissed twins block re-proposal, superseded/failed
don't. Stage movement supersedes cards that no longer fit (reconcile in
events.ts — the stage↔kind validity map lives there, NOT in the repository).

Execution lifecycle: `proposed` → **`approved`** (atomic claim in
executeProposal — blocks double-taps and the reconcile race from the
schedule emitter's own stage_changed event) → `executed`/`failed`.
Stale interview slots don't error into HR's face: the approve tap detects a
past slot, regenerates a fresh card, and fails the old one (failed doesn't
block dedupe). `nudge_stale` skips `offer_sent` candidates who never got an
offer email (approvals set that stage before the email exists).

## Test hook

`AGENT_STALE_OVERRIDE_SECONDS` (env/dev var) shrinks every stale threshold so
the DO→sweep→nudge roundtrip is verifiable in seconds. `/api/agent/ping`
(CRON_SECRET) arms timers and reads a job agent's snapshot.

## Reconcile train (2026-09-08 — agentic audit P1)

The event path + DO timers are the fast lane. `reconcile.ts` is the
truth-based backstop: once a day it re-reads D1 and proposes whatever the fast
lane missed (lost alarm, event emitted before a deploy, row edited by hand).
Same dedupe keys → a healthy day proposes nothing.

| kind              | reconcile finds…                                  | approve executes                                           |
| ----------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| `confirm_hire`    | `offer_accepted` with no hire (also event-driven) | `transitionStage(hired)` + `ensureEmployeeForCandidate`    |
| `retry_scoring`   | `ai_screening_status='failed'` in intake          | `enqueueScoring` + `triggerScoring` (manual hint ≥3 tries) |
| `orphan_approval` | pending approval steps off `approving` / archived | cancels the pending steps                                  |
| `nudge_stale`     | re-runs `sweepCandidate` for every watched stage  | (unchanged)                                                |
| —                 | open cards on archived candidates                 | superseded                                                 |

Dedupe keys: `ch:<cand>`, `rs:<cand>:<attempts>`, `oa:<cand>:<stage>`.

**Scheduling:** `daily.ts` `runDailySweeps()` runs the HRM compliance sweep +
`reconcileHiring()` at most once per VN calendar day behind the
`agent_last_daily_sweep` settings marker; `custom-worker` pokes
`/api/agent/daily` every minute after 01:00 UTC, so a missed tick catches up
on the next minute (a throwing run clears the marker to retry). `?force=1`
re-runs today.

**Guards added in the same train**

- `uq_proposals_open_dedupe` — partial unique index (migration 0014) so two
  concurrent generators can't both open a twin; `createProposal` treats the
  UNIQUE error as "skip".
- `preflightError` in `execute.ts` — a card whose candidate moved to a stage
  the kind doesn't fit fails with a plain reason instead of acting.
- `server/ai/availability.ts` `aiAvailability()` — THE AI gate (kill switch +
  cost breaker); the scoring claim-time guard used to ignore the breaker.
- `proposalStats()` + `AgentHealthCard` (on `/cai-dat/he-thong`) — 30-day run
  log: cards by kind/status, acceptance rate, oldest open card, recent failures.
