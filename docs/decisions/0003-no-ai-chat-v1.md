# 0003 — No AI Chat panel on candidate detail in v1

**Date:** 2026-04-21
**Status:** Accepted
**Decision-makers:** Sanh Võ + Claude

## Context

Candidate detail page shows AI score breakdown (6 criteria + evidence quotes). One option considered was a chat panel where Manager (or HR) could ask free-form questions about a candidate and Gemini answers using the parsed CV as context ("Has this person worked retail before?", "What's their longest tenure?").

## Decision

**Do not build a candidate-scoped AI chat panel in v1.** Score Card with verified evidence quotes is the only AI-generated content surfaced to users.

## Alternatives considered

- **Per-candidate chat (manager + HR can use)** — chat panel on candidate detail with suggestion chips. ~$0.001/candidate cost. Compelling because managers don't read CVs cover-to-cover. Rejected because (a) introduces free-text AI drift with no rubric anchor, (b) audit complexity, (c) over-reliance on AI summaries that managers can't verify on the floor, (d) extra build effort + edge cases.
- **Per-candidate + cross-candidate compare** — even more powerful, more complex.
- **HR-only chat** — limits scope but loses manager self-service value.

## Consequences

- **Pro:**
  - Simpler v1; less to test, less to audit
  - Score Card with 6 criteria + per-criterion reasoning + evidence quotes is already explainable
  - Forces the rubric to do its job; if it's incomplete, fix the rubric (not paper over with chat)
- **Con:**
  - Manager can't probe areas not covered by the 6 criteria (mitigation: HR can request additional review or run a manual interview)
- **Re-evaluate** if managers explicitly request it after 3 months of usage or if a specific gap in the rubric emerges that's hard to address by editing rubric text.

## References

- Master plan §13b.6 (Candidate Detail spec)
- ADR-0004 (Decoupled scoring + evidence validation — the "trust" foundation that makes chat unnecessary at v1)
