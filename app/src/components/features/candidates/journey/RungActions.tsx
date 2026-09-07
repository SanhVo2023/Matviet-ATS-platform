"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, LogOut, Send, UserCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScheduleInterviewDialog } from "@/components/features/interviews/ScheduleInterviewDialog";
import { RejectReasonDialog } from "@/components/features/candidates/RejectReasonDialog";
import { nextActionsFor, type NextAction } from "@/lib/next-actions";
import type { Stage } from "@/lib/validation/candidate";
import type { RejectionReason } from "@/lib/stages";
import { changeStageAction } from "@/app/(dashboard)/ung-vien/actions";
import { startApprovalAction } from "@/app/(dashboard)/phong-van/actions";

interface Props {
  candidateId: string;
  candidateName: string;
  stage: Stage;
  role: "admin" | "hr" | "hiring_manager" | "bod" | "tap_doan";
  interviewers: Array<{ id: string; full_name: string | null; role: string }>;
}

const ICONS: Record<NextAction["key"], typeof Send> = {
  schedule_interview: CalendarPlus,
  start_approval: Send,
  mark_hired: UserCheck,
  reject: XCircle,
  withdraw: LogOut,
};

/**
 * The current rung's action bar (ADR 0019): stage-driven, role-filtered —
 * the ONE obvious next move plus quiet secondaries. Reject opens a reason
 * picker (renovation R1) so a consequential, now-categorized action never
 * fires by accident.
 */
export function RungActions({ candidateId, candidateName, stage, role, interviewers }: Props) {
  const router = useRouter();
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);

  const actions = nextActionsFor(stage, role);
  if (actions.length === 0) return null;

  const doReject = async (reason: RejectionReason, note: string) => {
    setPending("reject");
    try {
      const res = await changeStageAction(candidateId, "rejected", reason, note);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Đã chuyển hồ sơ sang Từ chối.");
        setRejectOpen(false);
        router.refresh();
      }
    } finally {
      setPending(null);
    }
  };

  const run = async (key: NextAction["key"]) => {
    if (key === "schedule_interview") return setScheduleOpen(true);
    if (key === "reject") return setRejectOpen(true);
    setPending(key);
    try {
      if (key === "start_approval") {
        const res = await startApprovalAction(candidateId);
        if (!res.ok) toast.error(res.error);
        else if (res.data?.already_started) toast.info("Chuỗi phê duyệt đã được tạo trước đó.");
        else toast.success("Đã tạo chuỗi phê duyệt — chờ duyệt.");
      } else if (key === "mark_hired") {
        const res = await changeStageAction(candidateId, "hired");
        if (!res.ok) toast.error(res.error);
        else toast.success("Đã ghi nhận: ứng viên chính thức được tuyển.");
      } else if (key === "withdraw") {
        const res = await changeStageAction(candidateId, "withdrew");
        if (!res.ok) toast.error(res.error);
        else toast.success("Đã ghi nhận: ứng viên rút hồ sơ.");
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => {
        const Icon = ICONS[a.key];
        const isQuiet = a.key === "reject" || a.key === "withdraw";
        return (
          <Button
            key={a.key}
            type="button"
            size="sm"
            variant={a.primary ? "navy" : isQuiet ? "ghost" : "outline"}
            className={cn(
              a.key === "reject" && "ml-auto text-rose-600 hover:bg-rose-50 hover:text-rose-700",
              a.key === "withdraw" && "text-slate-500 hover:bg-slate-50",
            )}
            disabled={pending !== null}
            onClick={() => run(a.key)}
          >
            {pending === a.key ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Icon className="h-4 w-4" aria-hidden />
            )}
            {a.label}
          </Button>
        );
      })}

      <ScheduleInterviewDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        candidateId={candidateId}
        candidateName={candidateName}
        interviewers={interviewers}
      />
      <RejectReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        candidateName={candidateName}
        onConfirm={doReject}
        busy={pending === "reject"}
      />
    </div>
  );
}
