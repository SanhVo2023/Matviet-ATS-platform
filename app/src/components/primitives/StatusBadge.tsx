import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { Database } from "@/types/db";

type JobStatus = Database["public"]["Enums"]["job_status"];
type Stage = Database["public"]["Enums"]["pipeline_stage"];

const JOB_STATUS_CLASS: Record<JobStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  open: "bg-success-bg text-success-fg",
  paused: "bg-warning-bg text-warning-fg",
  closed: "bg-slate-100 text-slate-600",
  filled: "bg-primary-50 text-primary-800",
};

const STAGE_CLASS: Record<Stage, string> = {
  new: "bg-slate-100 text-slate-700",
  screening: "bg-primary-50 text-primary-800",
  screened: "bg-primary-50 text-primary-800",
  interview_scheduled: "bg-accent-100 text-accent-700",
  interviewed: "bg-accent-100 text-accent-700",
  test_sent: "bg-violet-100 text-violet-700",
  test_done: "bg-violet-100 text-violet-700",
  recommended: "bg-indigo-100 text-indigo-700",
  salary_deal: "bg-indigo-100 text-indigo-700",
  bod_review: "bg-indigo-100 text-indigo-700",
  tap_doan_review: "bg-indigo-100 text-indigo-700",
  offer_sent: "bg-success-bg text-success-fg",
  offer_accepted: "bg-success text-white",
  hired: "bg-success text-white",
  rejected: "bg-rose-100 text-rose-700",
  withdrew: "bg-zinc-100 text-zinc-600",
};

const PILL_CLASS = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <span className={cn(PILL_CLASS, JOB_STATUS_CLASS[status])}>{t.jobStatus[status]}</span>;
}

export function StageBadge({ stage }: { stage: Stage }) {
  return <span className={cn(PILL_CLASS, STAGE_CLASS[stage])}>{t.stage[stage]}</span>;
}
