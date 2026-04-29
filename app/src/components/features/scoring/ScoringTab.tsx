import { jobWeights } from "@/server/scoring/repository";
import type { AiScreeningRow } from "@/server/scoring/repository";
import type { CandidateRow } from "@/server/candidates/repository";
import type { JobRow } from "@/server/jobs/repository";
import type { VerifiedCriteria } from "@/lib/ai/gemini/types";
import { ScoreCard } from "./ScoreCard";
import { ScoringPending } from "./ScoringPending";
import { ScoringFailed } from "./ScoringFailed";

interface Props {
  candidate: CandidateRow;
  job: JobRow | null;
  latestScreening: AiScreeningRow | null;
  queueStatus: {
    status: string;
    attempts: number;
    last_error: string | null;
    enqueued_at: string;
  } | null;
  /** Admin / HR only: show cost. */
  isAdmin?: boolean;
}

const DOCX_REASON_RE = /docx|chuy[eểeé]n[\s-]?[đdĐD][oơôổ]i/i;

/**
 * Center-column "Phân tích AI" tab. Three states:
 *   - pending → ScoringPending (polls every 3s)
 *   - failed  → ScoringFailed (retry + manual sliders)
 *   - success → ScoreCard
 *
 * Server component — pulls everything from the parent's data fetch; no client-side
 * fetching. Polling re-runs the parent route via router.refresh().
 */
export function ScoringTab({ candidate, job, latestScreening, queueStatus, isAdmin }: Props) {
  const weights = jobWeights(job?.weights);

  if (candidate.ai_screening_status === "failed") {
    const reason = candidate.ai_screening_error ?? queueStatus?.last_error ?? "Không rõ lý do.";
    const docxBlocked = DOCX_REASON_RE.test(reason);
    return (
      <ScoringFailed
        candidateId={candidate.id}
        reason={reason}
        weights={weights}
        docxBlocked={docxBlocked}
      />
    );
  }

  if (!latestScreening) {
    return (
      <ScoringPending candidateId={candidate.id} enqueuedAt={queueStatus?.enqueued_at ?? null} />
    );
  }

  // Success path — show the card. Detect "weights changed since last screening".
  const weightsChanged =
    latestScreening.created_at != null && job?.updated_at != null
      ? new Date(job.updated_at).getTime() > new Date(latestScreening.created_at).getTime()
      : false;
  const criteria = (latestScreening.criteria ?? {}) as unknown as VerifiedCriteria;
  const summary = pickSummary(latestScreening.pass2_raw);

  return (
    <ScoreCard
      candidateId={candidate.id}
      total={Number(latestScreening.total)}
      criteria={criteria}
      weights={weights}
      summary={summary}
      model={latestScreening.model}
      scoredAt={latestScreening.created_at}
      costUsd={latestScreening.cost_usd ?? null}
      weightsChanged={weightsChanged}
      showCost={isAdmin}
    />
  );
}

function pickSummary(raw: unknown): string | null {
  if (raw && typeof raw === "object" && "overall_summary" in raw) {
    const s = (raw as { overall_summary?: unknown }).overall_summary;
    return typeof s === "string" ? s : null;
  }
  return null;
}
