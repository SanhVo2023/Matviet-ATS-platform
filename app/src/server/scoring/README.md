# `src/server/scoring`

AI scoring pipeline — Group 4. The visible product moment is the **Score Card** on the candidate detail page; this module is the brain behind it.

## Public API

```ts
// Enqueue + (optionally) kick the worker
import { enqueueScoring } from "./repository";
import { triggerEdgeFunction } from "./orchestration";

await enqueueScoring(candidateId, profile.id);
triggerEdgeFunction(candidateId); // fire-and-forget

// Read for UI
import { getLatestScreening, getQueueStatus } from "./repository";

// Manual fallback (HR enters slider scores)
import { recordManualScore } from "./repository";

// Re-aggregate when job.weights changes — no Gemini call
import { reaggregateScoresForJob } from "./repository";
```

## Flow

1. HR uploads CV → `uploadCandidateAction` calls `enqueueScoring()` then `triggerEdgeFunction()`.
2. Edge Function `score-candidate` (Deno) wakes:
   - `pick_scoring_job()` SQL helper atomically dequeues a row.
   - Downloads CV bytes from Storage (`cv_files.pdf_storage_path` if present, else `storage_path`).
   - Pass 1: Gemini parses CV → structured JSON.
   - Pass 2: Gemini scores 6 criteria with evidence quotes.
   - `validateEvidence` fuzzy-matches each quote against parsed CV text.
   - Inserts `ai_screenings` (with raw + verified criteria + weights_snapshot + cost).
   - The DB trigger `bump_candidate_score` denormalizes onto `candidates`.
   - Marks queue row `succeeded`.
3. UI re-renders on next nav / poll → `<ScoreCard />` shows.

## Failure paths

- **Gemini 429 rate-limit** → `next_retry_at = now() + 2^attempts × 5s`, max 3 attempts.
- **Quota exhausted** → `next_retry_at = next midnight UTC+7`.
- **Invalid PDF / schema mismatch / 5xx** → no retry; `candidates.ai_screening_status='failed'`, error stored, manual sliders shown.
- **DOCX without `pdf_storage_path`** → fail with reason "Cần chuyển đổi DOCX sang PDF" — LibreOffice worker (deferred to Sanh) populates `pdf_storage_path` later.

## Cron safety net

`/api/scoring/drain` runs every 5 min (Netlify Cron). Selects queued + retry-due rows from `scoring_queue` and fires the Edge Function for each. Exists in case the upload-time fire-and-forget gets dropped (cold starts, network blips).

## Files

- `repository.ts` — DB I/O (admin + RLS clients).
- `orchestration.ts` — fire-and-forget HTTP to the Edge Function.
- `weights.ts` — pure math: `computeWeightedTotal`, `readWeights`, `isValidWeights`.
- `evidence.ts` — Fuse.js fuzzy validation of Gemini quotes; `synthesizeRawText` for the parsed-CV → text concat.
- `rubric-content.ts` — per-role-family calibration text (verbatim from `docs/content/scoring-rubrics.md`).
- `rubric.ts` — re-export shim.

## Reference

- ADR-0004 (Decoupled scoring architecture) — why raw scores live in `ai_screenings.criteria` and weights apply at query time.
- ADR-0006 (Paid Gemini API tier) — privacy posture.
- master plan §26 — full scoring contract.
- migration 0014 — `scoring_queue`, `ai_screening_status`, `pick_scoring_job()`, `reaggregate_job_scores()`.
