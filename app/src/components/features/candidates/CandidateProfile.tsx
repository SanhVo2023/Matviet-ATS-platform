import Link from "next/link";
import { Mail, Phone, MapPin, Briefcase, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StageDropdown } from "./StageDropdown";
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
      <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-6 text-center">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="text-xl">{initials(candidate.full_name)}</AvatarFallback>
        </Avatar>
        <h1 className="text-lg font-semibold text-slate-900">{candidate.full_name}</h1>
        <p className="text-xs text-slate-500">Nguồn: {t.source[candidate.source]}</p>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {candidate.ai_score != null ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-slate-800">
              {Math.round(candidate.ai_score)}
              <span className="text-[10px] font-normal text-slate-500">điểm</span>
            </span>
          ) : null}
          <ScoringStatusPill status={candidate.ai_screening_status} />
        </div>

        <div className="mt-2">
          <StageDropdown candidateId={candidate.id} currentStage={candidate.current_stage} />
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
          href={`/tin-tuyen-dung/${jobId}`}
        />
        <DataItem icon={Calendar} label="Đã nộp" value={formatRelative(candidate.created_at)} />
      </dl>

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
