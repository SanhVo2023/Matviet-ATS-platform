"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Send, UserCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScheduleInterviewDialog } from "@/components/features/interviews/ScheduleInterviewDialog";
import { nextActionsFor, type NextAction } from "@/lib/next-actions";
import type { Stage } from "@/lib/validation/candidate";
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
};

/**
 * The current rung's action bar (ADR 0019): stage-driven, role-filtered —
 * the ONE obvious next move plus quiet secondaries. Reject is two-step
 * (click again to confirm) so a consequential action never fires by accident.
 */
export function RungActions({ candidateId, candidateName, stage, role, interviewers }: Props) {
  const router = useRouter();
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const [confirmReject, setConfirmReject] = React.useState(false);

  const actions = nextActionsFor(stage, role);
  if (actions.length === 0) return null;

  const run = async (key: NextAction["key"]) => {
    if (key === "schedule_interview") {
      setScheduleOpen(true);
      return;
    }
    if (key === "reject" && !confirmReject) {
      setConfirmReject(true);
      window.setTimeout(() => setConfirmReject(false), 4000);
      return;
    }
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
        else toast.success("Đã ghi nhận: ứng viên chính thức được tuyển. 🎉");
      } else if (key === "reject") {
        const res = await changeStageAction(candidateId, "rejected");
        if (!res.ok) toast.error(res.error);
        else toast.success("Đã chuyển hồ sơ sang Từ chối.");
        setConfirmReject(false);
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
        const isReject = a.key === "reject";
        return (
          <Button
            key={a.key}
            type="button"
            size="sm"
            variant={a.primary ? "navy" : isReject ? "ghost" : "outline"}
            className={
              isReject ? "ml-auto text-rose-600 hover:bg-rose-50 hover:text-rose-700" : undefined
            }
            disabled={pending !== null}
            onClick={() => run(a.key)}
          >
            {pending === a.key ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Icon className="h-4 w-4" aria-hidden />
            )}
            {isReject && confirmReject ? "Bấm lần nữa để xác nhận" : a.label}
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
    </div>
  );
}
