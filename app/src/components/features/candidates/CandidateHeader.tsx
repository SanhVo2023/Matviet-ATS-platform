import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StageDropdown } from "./StageDropdown";
import { ScoringStatusPill } from "@/components/features/scoring/ScoringStatusPill";
import type { CandidateRow } from "@/server/candidates/repository";
import { CLOSED_GROUP, groupOfStage, type Stage } from "@/lib/validation/candidate";
import { initials } from "@/lib/vi-format";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface Props {
  candidate: CandidateRow;
  jobTitle: string | null;
  jobId: string;
  /** AI summary block (2026-07-16 merge) — lives INSIDE the header card. */
  aiSummarySlot?: React.ReactNode;
}

/**
 * Slim identity header (ADR 0019): who + score + the stage escape hatch +
 * the AI narrative (merged 2026-07-16 — was its own card wasting the top
 * slot on an empty state). WHERE the candidate is and WHAT happened lives
 * in the journey ladder below; contact lives in the reference rail.
 */
export function CandidateHeader({ candidate, jobTitle, jobId, aiSummarySlot }: Props) {
  const stage = candidate.current_stage as Stage;
  const isClosed = groupOfStage(stage).id === CLOSED_GROUP.id;

  return (
    <header className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:p-5">
      <Avatar className="h-12 w-12 shrink-0 ring-2 ring-accent-400/70">
        <AvatarFallback className="bg-brand-900 text-white">
          {initials(candidate.full_name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-xl font-semibold text-brand-900">{candidate.full_name}</h1>
          {candidate.ai_score != null ? (
            <span
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-900 px-2 text-sm font-extrabold tabular-nums text-accent-400"
              aria-label={`Điểm AI: ${Math.round(candidate.ai_score)}`}
              title="Điểm AI"
            >
              {Math.round(candidate.ai_score)}
            </span>
          ) : (
            <ScoringStatusPill status={candidate.ai_screening_status} />
          )}
          {isClosed ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                stage === "rejected" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600",
              )}
            >
              Đã đóng — {t.stage[stage]}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          <Link href={`/vi-tri/${jobId}`} className="text-primary-600 hover:underline">
            {jobTitle ?? "—"}
          </Link>
          <span className="text-slate-400"> · Nguồn: {t.source[candidate.source]}</span>
        </p>
      </div>

      {/* Own row on phones so the name column isn't squeezed to one word/line */}
      <div className="w-full shrink-0 sm:w-auto">
        <StageDropdown
          candidateId={candidate.id}
          candidateName={candidate.full_name}
          currentStage={candidate.current_stage}
        />
      </div>

      {aiSummarySlot ? (
        <div className="w-full border-t border-slate-100 pt-3">{aiSummarySlot}</div>
      ) : null}
    </header>
  );
}
