import Link from "next/link";
import { Check, Mail, MapPin, Phone, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StageDropdown } from "./StageDropdown";
import { ScoringStatusPill } from "@/components/features/scoring/ScoringStatusPill";
import type { CandidateRow } from "@/server/candidates/repository";
import {
  STAGE_GROUPS,
  CLOSED_GROUP,
  groupOfStage,
  stageReadiness,
  type Stage,
  type ReadinessTone,
} from "@/lib/validation/candidate";
import { initials, formatRelative } from "@/lib/vi-format";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface Props {
  candidate: CandidateRow;
  jobTitle: string | null;
  jobId: string;
}

const DOT_CLASS: Record<ReadinessTone, string> = {
  ready: "bg-emerald-500",
  waiting: "bg-slate-300",
  blocked: "bg-rose-500",
  done: "bg-emerald-500 ring-2 ring-emerald-200",
};

const LABEL_CLASS: Record<ReadinessTone, string> = {
  ready: "text-emerald-700",
  waiting: "text-slate-500",
  blocked: "text-rose-600",
  done: "text-emerald-700",
};

/**
 * Full-width identity + journey header (2026-07-08 redesign): who the
 * candidate is, how to reach them, and — via the same 4 business groups as
 * the kanban — WHERE they are in the pipeline and WHAT the next step is.
 */
export function CandidateHeader({ candidate, jobTitle, jobId }: Props) {
  const stage = candidate.current_stage as Stage;
  const group = groupOfStage(stage);
  const readiness = stageReadiness(stage, candidate.ai_screening_status);
  const isClosed = group.id === CLOSED_GROUP.id;
  const currentIdx = STAGE_GROUPS.findIndex((g) => g.id === group.id);

  return (
    <header className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start gap-4 p-4 lg:p-5">
        <Avatar className="h-14 w-14 shrink-0 ring-2 ring-accent-400/70">
          <AvatarFallback className="bg-brand-900 text-lg text-white">
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
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            <Link href={`/vi-tri/${jobId}`} className="text-primary-600 hover:underline">
              {jobTitle ?? "—"}
            </Link>
            <span className="text-slate-400"> · Nguồn: {t.source[candidate.source]}</span>
          </p>

          {/* Contact strip */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <ContactItem icon={Mail} value={candidate.email} href={`mailto:${candidate.email}`} />
            <ContactItem icon={Phone} value={candidate.phone} href={`tel:${candidate.phone}`} />
            <ContactItem icon={MapPin} value={candidate.location} />
            <ContactItem icon={Calendar} value={`Nộp ${formatRelative(candidate.created_at)}`} />
          </div>
        </div>

        <div className="shrink-0">
          <StageDropdown candidateId={candidate.id} currentStage={candidate.current_stage} />
        </div>
      </div>

      {/* Journey stepper — same 4 business groups as the kanban board */}
      {isClosed ? (
        <div
          className={cn(
            "flex items-center gap-2 border-t px-4 py-2.5 text-sm lg:px-5",
            stage === "rejected"
              ? "border-rose-100 bg-rose-50 text-rose-700"
              : "border-slate-100 bg-slate-50 text-slate-600",
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", DOT_CLASS[readiness.tone])} aria-hidden />
          <span className="font-medium">
            {CLOSED_GROUP.icon} Hồ sơ đã đóng — {t.stage[stage]}
          </span>
        </div>
      ) : (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 lg:px-5">
          {/* Desktop: all 4 steps */}
          <ol className="hidden items-center gap-2 sm:flex">
            {STAGE_GROUPS.map((g, i) => {
              const state = i < currentIdx ? "done" : i === currentIdx ? "current" : "todo";
              return (
                <li key={g.id} className="flex min-w-0 flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                      state === "current" && "bg-brand-900 text-white",
                      state === "done" && "text-emerald-700",
                      state === "todo" && "text-slate-400",
                    )}
                    title={g.description}
                  >
                    {state === "done" ? (
                      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    ) : (
                      <span aria-hidden>{g.icon}</span>
                    )}
                    <span className="truncate">{g.label}</span>
                  </div>
                  {i < STAGE_GROUPS.length - 1 ? (
                    <span
                      className={cn(
                        "h-px min-w-3 flex-1",
                        i < currentIdx ? "bg-emerald-300" : "bg-slate-200",
                      )}
                      aria-hidden
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
          {/* Mobile: current step only */}
          <p className="text-xs font-medium text-brand-900 sm:hidden">
            {group.icon} {group.label}
          </p>
          {/* Readiness — what's next, in plain language */}
          <p className="mt-1.5 flex items-center gap-1.5 text-xs">
            <span className={cn("h-2 w-2 rounded-full", DOT_CLASS[readiness.tone])} aria-hidden />
            <span className={cn("font-medium", LABEL_CLASS[readiness.tone])}>
              {readiness.label}
            </span>
            <span className="text-slate-400">· {t.stage[stage]}</span>
          </p>
        </div>
      )}
    </header>
  );
}

function ContactItem({
  icon: Icon,
  value,
  href,
}: {
  icon: typeof Mail;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value) return null;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      {href ? (
        <a href={href} className="truncate hover:text-primary-600 hover:underline">
          {value}
        </a>
      ) : (
        <span className="truncate">{value}</span>
      )}
    </span>
  );
}
