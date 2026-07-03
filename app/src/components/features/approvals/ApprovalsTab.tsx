"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApprovalTimeline } from "./ApprovalTimeline";
import { startApprovalAction } from "@/app/(dashboard)/phong-van/actions";
import type { ApprovalRow } from "@/server/approvals/repository";
import type { Database } from "@/types/db";

interface Props {
  candidateId: string;
  approvals: ApprovalRow[];
  currentRole: Database["public"]["Enums"]["user_role"];
  currentUserOwnsManagerStep?: boolean;
  actorNames?: Record<string, string>;
  /** Hint shown when "Đẩy lên duyệt" is unavailable (wrong role or wrong stage). */
  canStart?: boolean;
}

export function ApprovalsTab({
  candidateId,
  approvals,
  currentRole,
  currentUserOwnsManagerStep,
  actorNames,
  canStart = true,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const onStart = () => {
    startTransition(async () => {
      const r = await startApprovalAction(candidateId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Đã tạo quy trình duyệt.");
      router.refresh();
    });
  };

  if (approvals.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm font-medium text-slate-700">Chưa có quy trình duyệt</p>
        <p className="mt-1 text-xs text-slate-500">
          Sau khi có ít nhất một đánh giá phỏng vấn, HR có thể đẩy ứng viên lên quy trình duyệt.
        </p>
        {canStart ? (
          <Button onClick={onStart} disabled={pending} size="sm" variant="navy" className="mt-3">
            <Send className="h-3.5 w-3.5" aria-hidden />
            {pending ? "Đang xử lý..." : "Đẩy lên duyệt"}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ApprovalTimeline
        approvals={approvals}
        currentRole={currentRole}
        currentUserOwnsManagerStep={currentUserOwnsManagerStep}
        actorNames={actorNames}
      />
    </div>
  );
}
