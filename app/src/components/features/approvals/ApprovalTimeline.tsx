"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { STEP_LABEL_VI } from "@/server/approvals/presets";
import { decideApprovalAction } from "@/app/(dashboard)/phe-duyet/actions";
import { formatRelative } from "@/lib/vi-format";
import type { ApprovalRow } from "@/server/approvals/repository";
import type { Database } from "@/types/db";

type StepKind = Database["public"]["Enums"]["approval_step_kind"];

interface Props {
  approvals: ApprovalRow[];
  /** Current user role — controls which step's Approve/Reject buttons are clickable. */
  currentRole: Database["public"]["Enums"]["user_role"];
  /** Used to determine if the current user owns the manager step. */
  currentUserOwnsManagerStep?: boolean;
  /** Map of profile IDs → display names (HR + previous decision actors). */
  actorNames?: Record<string, string>;
}

const ROLE_TO_STEP: Partial<Record<Database["public"]["Enums"]["user_role"], StepKind[]>> = {
  hr: ["hr_recommend", "salary_deal"],
  admin: ["hr_recommend", "salary_deal", "manager_recommend", "bod", "tap_doan"],
  hiring_manager: ["manager_recommend"],
  bod: ["bod"],
  tap_doan: ["tap_doan"],
};

export function ApprovalTimeline({
  approvals,
  currentRole,
  currentUserOwnsManagerStep,
  actorNames = {},
}: Props) {
  if (approvals.length === 0) return null;

  const ownedSteps = ROLE_TO_STEP[currentRole] ?? [];
  const firstPendingIdx = approvals.findIndex((a) => a.status === "pending");

  return (
    <ol className="space-y-3">
      {approvals.map((row, idx) => {
        const isCurrent = idx === firstPendingIdx;
        const canAct =
          isCurrent &&
          ownedSteps.includes(row.step_kind as StepKind) &&
          (row.step_kind !== "manager_recommend" ||
            currentUserOwnsManagerStep ||
            currentRole === "admin" ||
            currentRole === "hr");
        return (
          <ApprovalStep
            key={row.id}
            row={row}
            current={isCurrent}
            canAct={!!canAct}
            actorName={row.actor_user_id ? (actorNames[row.actor_user_id] ?? null) : null}
          />
        );
      })}
    </ol>
  );
}

function ApprovalStep({
  row,
  current,
  canAct,
  actorName,
}: {
  row: ApprovalRow;
  current: boolean;
  canAct: boolean;
  actorName: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [decision, setDecision] = React.useState<"approved" | "rejected" | null>(null);
  const router = useRouter();

  const submit = async (chosen: "approved" | "rejected") => {
    setDecision(chosen);
    setPending(true);
    const r = await decideApprovalAction(row.id, chosen, notes.trim() || undefined);
    setPending(false);
    if (!r.ok) {
      toast.error(r.error);
      setDecision(null);
      return;
    }
    toast.success(chosen === "approved" ? t.success.approved : t.success.rejected);
    setOpen(false);
    setNotes("");
    setDecision(null);
    router.refresh();
  };

  const stepLabel = STEP_LABEL_VI[row.step_kind as StepKind];
  const status = row.status;

  return (
    <li
      className={cn(
        "rounded-md border bg-white p-3",
        status === "approved" && "border-success/30 bg-success-bg/30",
        status === "rejected" && "border-error/30 bg-error-bg/30",
        status === "pending" && current && "border-accent-300 ring-2 ring-accent-100",
        status === "pending" && !current && "border-slate-200 opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <StepIcon status={status} current={current} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">{stepLabel}</p>
            <p className="text-xs text-slate-500">
              {status === "pending"
                ? current
                  ? "Đang chờ"
                  : "Sẽ đến lượt sau"
                : status === "approved"
                  ? `${t.approvalStatus.approved}${row.decided_at ? " · " + formatRelative(row.decided_at) : ""}`
                  : `${t.approvalStatus.rejected}${row.decided_at ? " · " + formatRelative(row.decided_at) : ""}`}
            </p>
          </div>
          {actorName ? (
            <p className="mt-1 text-xs text-slate-600">
              <span className="text-slate-400">Bởi:</span> {actorName}
            </p>
          ) : null}
          {row.notes ? (
            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700" lang="vi">
              {row.notes}
            </p>
          ) : null}

          {canAct && !open ? (
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="navy"
                className="bg-success text-white hover:bg-success/90"
                onClick={() => setOpen(true)}
                disabled={pending}
              >
                {t.action.approve}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-error/40 text-error-fg hover:bg-error-bg/50"
                onClick={() => {
                  setOpen(true);
                }}
                disabled={pending}
              >
                {t.action.reject}
              </Button>
            </div>
          ) : null}

          {canAct && open ? (
            <div className="mt-2 space-y-2">
              <Textarea
                rows={2}
                placeholder="Ghi chú (tùy chọn)…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                lang="vi"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="navy"
                  className="bg-success text-white hover:bg-success/90"
                  onClick={() => submit("approved")}
                  disabled={pending}
                >
                  {pending && decision === "approved" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : null}
                  {t.action.approve}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-error/40 text-error-fg hover:bg-error-bg/50"
                  onClick={() => submit("rejected")}
                  disabled={pending}
                >
                  {pending && decision === "rejected" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : null}
                  {t.action.reject}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    setNotes("");
                  }}
                  disabled={pending}
                >
                  {t.action.cancel}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function StepIcon({ status, current }: { status: ApprovalRow["status"]; current: boolean }) {
  // Completed = navy check; rejected = danger; current = gold with a subtle
  // pulse ring (opacity-only, disabled under prefers-reduced-motion); future = slate.
  if (status === "approved")
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
        <Check className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  if (status === "rejected")
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-error text-white">
        <X className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  if (current)
    return (
      <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-700">
        <span
          className="absolute inset-0 rounded-full ring-2 ring-accent-400/70 motion-safe:animate-pulse"
          aria-hidden
        />
        <Circle className="h-3 w-3" aria-hidden />
      </span>
    );
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400">
      <Circle className="h-3 w-3" aria-hidden />
    </span>
  );
}
