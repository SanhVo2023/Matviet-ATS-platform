import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApprovalsTab } from "./ApprovalsTab";
import type { ApprovalRow } from "@/server/approvals/repository";
import type { Database } from "@/types/db";

interface Props {
  candidateId: string;
  approvals: ApprovalRow[];
  currentRole: Database["public"]["Enums"]["user_role"];
  currentUserOwnsManagerStep?: boolean;
  actorNames: Record<string, string>;
  canStart: boolean;
}

/**
 * Right-rail "Phê duyệt" card (Sanh 2026-07-06): approval is a PROGRESS
 * indicator living right under Lịch sử — not a tab you have to hunt for.
 * Thin progress bar (approved/total) on top; the existing ApprovalsTab
 * below it keeps the Đề xuất tuyển button and one-tap decide actions.
 */
export function ApprovalProgress(props: Props) {
  const { approvals } = props;
  const total = approvals.length;
  const approved = approvals.filter((a) => a.status === "approved").length;
  const rejected = approvals.some((a) => a.status === "rejected");
  const pct = total === 0 ? 0 : Math.round((approved / total) * 100);

  return (
    <section
      aria-label="Phê duyệt"
      className="mt-6 rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
          <span className="h-4 w-1 shrink-0 rounded-full bg-accent-400" aria-hidden />
          Phê duyệt
        </h2>
        {total > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
              rejected ? "text-error-fg" : pct === 100 ? "text-success-fg" : "text-slate-500",
            )}
          >
            {rejected ? (
              "Đã từ chối"
            ) : pct === 100 ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Hoàn tất
              </>
            ) : (
              `${approved}/${total} bước`
            )}
          </span>
        )}
      </div>

      {total > 0 && (
        <div
          className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              rejected ? "bg-rose-400" : pct === 100 ? "bg-emerald-500" : "bg-accent-400",
            )}
            style={{ width: `${rejected ? 100 : Math.max(pct, 6)}%` }}
          />
        </div>
      )}

      <div className="mt-3">
        <ApprovalsTab
          candidateId={props.candidateId}
          approvals={approvals}
          currentRole={props.currentRole}
          currentUserOwnsManagerStep={props.currentUserOwnsManagerStep}
          actorNames={props.actorNames}
          canStart={props.canStart}
        />
      </div>
    </section>
  );
}
