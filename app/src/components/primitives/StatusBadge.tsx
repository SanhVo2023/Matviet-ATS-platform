import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { groupOfStage, type Stage } from "@/lib/validation/candidate";
import { deriveCandidateStatus } from "@/lib/candidate-status";
import { GROUP_TINT, READINESS_DOT } from "@/lib/stage-visuals";
import { StageGroupIcon } from "./StageGroupIcon";
import type { Database } from "@/types/db";

type JobStatus = Database["public"]["Enums"]["job_status"];

const JOB_STATUS_CLASS: Record<JobStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  open: "bg-success-bg text-success-fg",
  paused: "bg-warning-bg text-warning-fg",
  closed: "bg-slate-100 text-slate-600",
  filled: "bg-primary-50 text-primary-800",
};

const PILL_CLASS = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <span className={cn(PILL_CLASS, JOB_STATUS_CLASS[status])}>{t.jobStatus[status]}</span>;
}

/**
 * ONE stage language (ADR 0019): detailed stage label, tinted by its BUSINESS
 * GROUP (same palette as kanban columns + the journey ladder). Pass `aiStatus`
 * where it's known to add the readiness dot inside the pill.
 */
export function StageBadge({
  stage,
  aiStatus,
}: {
  stage: Stage;
  aiStatus?: "pending" | "success" | "failed" | null;
}) {
  const group = groupOfStage(stage);
  const derived =
    aiStatus !== undefined
      ? deriveCandidateStatus({ current_stage: stage, ai_screening_status: aiStatus })
      : null;
  return (
    <span
      className={cn(PILL_CLASS, "gap-1", GROUP_TINT[group.id])}
      title={`${group.label} — ${t.stage[stage]}`}
    >
      {derived ? (
        <>
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", READINESS_DOT[derived.tone])}
            aria-hidden
          />
          <span className="sr-only">{derived.label}. </span>
        </>
      ) : (
        <StageGroupIcon groupId={group.id} className="h-3 w-3 shrink-0 opacity-80" />
      )}
      {t.stage[stage]}
    </span>
  );
}
