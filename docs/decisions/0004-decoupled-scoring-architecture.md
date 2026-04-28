# 0004 — Decoupled per-criterion scoring with query-time weighting

**Date:** 2026-04-21
**Status:** Accepted
**Decision-makers:** Sanh Võ + Claude

## Context

AI scoring needs to handle:
1. Per-criterion scores with weights configurable per job (HR can change weights anytime)
2. Explainable scores (per-criterion reasoning + evidence quotes from CV)
3. Cost-efficient (Gemini calls cost money + take time)
4. Auditable (every score traceable to model + prompt + timestamp)

Naive design: store final weighted total in `candidates.score`. Problem: when HR changes job weights, every candidate must be re-scored via Gemini → expensive, slow, blocks workflow.

## Decision

**Store RAW per-criterion scores in `ai_screenings.scores` (JSONB, source-of-truth). Apply weights at query time.** Re-aggregation on weight change is instant — no Gemini re-call needed.

## Schema implications

- `ai_screenings.scores` jsonb — `{ industry_fit: { score, reasoning, evidence_quotes }, ... }` (raw, no weights applied)
- `candidates.ai_score` numeric(5,2) — denormalized weighted_total for list-view sorting; recomputed when `jobs.weights` changes via background job (cheap SQL aggregation, no LLM)
- `jobs.weights` jsonb — sums to 1.0; per-criterion weights for that specific job

## Re-scoring matrix

| Trigger | Re-call Gemini? | Why |
|---|---|---|
| HR changes weights on a job | NO | Aggregate at query time using new weights |
| HR uploads new CV | YES | New input → new parse + score |
| Job's `criteria_config.keywords` change | YES (score pass only, parse cached) | Rubric content shifted |
| Gemini model upgraded | YES (manual sweep button) | Calibration drift |
| Re-running for audit | YES | Compare new vs cached |

## Alternatives considered

- **Store final weighted total only** — simpler queries; but every weight change is a full Gemini re-run. Rejected.
- **Store both raw AND weighted total without recompute** — weighted total goes stale silently when weights change. Rejected.
- **Compute weights in client only** — denormalized sort breaks; can't index. Rejected.

## Consequences

- **Pro:**
  - Weight changes are instant (recompute denormalized total via SQL)
  - HR can preview "what if I increase industry_fit weight" without cost
  - Per-criterion data is queryable (e.g., "show me top scores on professional_skills")
  - Re-scoring history preserved (multiple `ai_screenings` rows per candidate)
- **Con:**
  - Slightly more complex than "store final score only"
  - JSONB queries on per-criterion scores need GIN index if we want server-side filtering
- Audit trail is complete: every Gemini call writes a new `ai_screenings` row with full prompt + response.

## Evidence quote validation (related)

LLMs hallucinate citations 30-94% per published research. We add a fuzzy-match validator (`string-similarity` ≥ 95%) against parsed CV text. UI marks each quote verified/unverified — doesn't block scoring, builds incremental trust.

## References

- Master plan §26
- `docs/integrations.md` §1
- Industry research: rubric-based scoring patterns (Greenhouse, Lever)
