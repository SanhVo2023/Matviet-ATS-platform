import Link from "next/link";
import { Mail, Phone, MapPin, Briefcase, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StageDropdown } from "./StageDropdown";
import { CandidateAiSummary } from "./CandidateAiSummary";
import { ScoringStatusPill } from "@/components/features/scoring/ScoringStatusPill";
import type { CandidateRow } from "@/server/candidates/repository";
import { initials, formatRelative } from "@/lib/vi-format";
import { t } from "@/lib/i18n";

interface Props {
  candidate: CandidateRow;
  jobTitle: string | null;
  jobId: string;
}

export function CandidateProfile({ candidate, jobTitle, jobId }: Props) {
  return (
    <aside className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white text-center">
        {/* Navy header band */}
        <div className="flex flex-col items-center gap-2 bg-brand-900 px-6 pb-8 pt-6">
          <Avatar className="h-16 w-16 ring-2 ring-accent-400/70">
            <AvatarFallback className="bg-brand-700 text-lg text-white">
              {initials(candidate.full_name)}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-lg font-semibold text-white">{candidate.full_name}</h1>
          {jobTitle ? <p className="text-xs text-brand-200">{jobTitle}</p> : null}
          <p className="text-[11px] text-brand-300">Nguồn: {t.source[candidate.source]}</p>
        </div>

        <div className="flex flex-col items-center gap-2 px-6 pb-5 pt-4">
          {candidate.ai_score != null ? (
            <div
              className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-brand-900 text-xl font-extrabold tabular-nums text-accent-400 ring-4 ring-white"
              aria-label={`Điểm AI: ${Math.round(candidate.ai_score)}`}
            >
              {Math.round(candidate.ai_score)}
            </div>
          ) : null}
          <ScoringStatusPill status={candidate.ai_screening_status} />
          <div className="mt-1">
            <StageDropdown candidateId={candidate.id} currentStage={candidate.current_stage} />
          </div>
        </div>
      </div>

      <dl className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <DataItem
          icon={Mail}
          label="Email"
          value={candidate.email ?? "—"}
          href={candidate.email ? `mailto:${candidate.email}` : undefined}
        />
        <DataItem
          icon={Phone}
          label="SĐT"
          value={candidate.phone ?? "—"}
          href={candidate.phone ? `tel:${candidate.phone}` : undefined}
        />
        <DataItem icon={MapPin} label="Địa điểm" value={candidate.location ?? "—"} />
        <DataItem
          icon={Briefcase}
          label="Vị trí ứng tuyển"
          value={jobTitle ?? "—"}
          href={`/vi-tri/${jobId}`}
        />
        <DataItem icon={Calendar} label="Đã nộp" value={formatRelative(candidate.created_at)} />
      </dl>

      <CandidateAiSummary candidateId={candidate.id} />

      {candidate.notes ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Ghi chú nội bộ
          </p>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{candidate.notes}</p>
        </div>
      ) : null}
    </aside>
  );
}

function DataItem({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="truncate text-slate-700">
          {href ? (
            <Link href={href} className="hover:text-primary-600 hover:underline">
              {value}
            </Link>
          ) : (
            value
          )}
        </dd>
      </div>
    </div>
  );
}
