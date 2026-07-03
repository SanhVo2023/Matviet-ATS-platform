import { Activity } from "lucide-react";
import { StageBadge } from "@/components/primitives/StatusBadge";
import type { StageHistoryRow } from "@/server/candidates/repository";
import { formatDateTime, formatRelative } from "@/lib/vi-format";

interface Props {
  history: StageHistoryRow[];
  actorNames: Record<string, string>;
}

/**
 * Activity timeline for the right rail of the candidate detail page.
 * v1 surfaces stage_history only. G6 will fold in email events; G8 approval
 * decisions; G11 the full audit_log feed.
 */
export function CandidateTimeline({ history, actorNames }: Props) {
  if (history.length === 0) {
    return (
      <aside className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <Activity className="mx-auto h-5 w-5 text-slate-300" aria-hidden />
        <p className="mt-2 text-sm text-slate-500">Chưa có hoạt động.</p>
      </aside>
    );
  }

  return (
    <aside className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Lịch sử</h3>
      <ol className="ml-1.5 space-y-4 border-l border-slate-200 pl-4">
        {history.map((row) => {
          const actor = row.actor_user_id ? (actorNames[row.actor_user_id] ?? "—") : "Hệ thống";
          const isStageChange = row.from_stage != null;
          return (
            <li key={row.id} className="relative">
              <span
                className={
                  isStageChange
                    ? "absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full bg-accent-400 ring-2 ring-white"
                    : "absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full bg-brand-300 ring-2 ring-white"
                }
                aria-hidden
              />
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500">
                  {row.from_stage ? "Chuyển giai đoạn:" : "Tạo ứng viên ở giai đoạn:"}
                </span>
                {row.from_stage ? (
                  <>
                    <StageBadge stage={row.from_stage} />
                    <span className="text-slate-400">→</span>
                  </>
                ) : null}
                <StageBadge stage={row.to_stage} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {actor} ·{" "}
                <time dateTime={row.at} title={formatDateTime(row.at)}>
                  {formatRelative(row.at)}
                </time>
              </p>
              {row.notes ? <p className="mt-1 text-xs text-slate-700">{row.notes}</p> : null}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
