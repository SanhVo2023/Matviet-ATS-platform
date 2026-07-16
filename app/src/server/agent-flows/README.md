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
open/executed/dismissed twins block re-proposal, superseded/failed don't.
Stage movement supersedes cards that no longer fit
(`reconcileOpenProposals`).

## Test hook

`AGENT_STALE_OVERRIDE_SECONDS` (env/dev var) shrinks every stale threshold so
the DO→sweep→nudge roundtrip is verifiable in seconds. `/api/agent/ping`
(CRON_SECRET) arms timers and reads a job agent's snapshot.
