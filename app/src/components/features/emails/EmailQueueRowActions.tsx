"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import {
  approveEmailAction,
  cancelEmailAction,
  manualRetryEmailAction,
} from "@/app/(dashboard)/email/actions";
import type { Database } from "@/types/db";

type EmailStatus = Database["public"]["Enums"]["email_status"];

interface Props {
  id: string;
  status: EmailStatus;
}

export function EmailQueueRowActions({ id, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const handleApprove = async () => {
    setBusy(true);
    const res = await approveEmailAction(id);
    setBusy(false);
    if (!res.ok) toast.error(res.error);
    else {
      toast.success(t.emails.statusLabel.queued);
      router.refresh();
    }
  };

  const handleSendNow = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/emails/${id}/send`, { method: "POST" });
      const json = (await res.json()) as { result?: string; error?: string };
      if (!res.ok || json.result === "failed") {
        toast.error(json.error ?? "Không gửi được");
      } else if (json.result === "sent") {
        toast.success(t.emails.statusLabel.sent);
      } else {
        toast.message("Đang thử lại — xem lại sau ít phút");
      }
    } finally {
      setBusy(false);
      router.refresh();
    }
  };

  const handleRetry = async () => {
    setBusy(true);
    const res = await manualRetryEmailAction(id);
    setBusy(false);
    if (!res.ok) toast.error(res.error);
    else {
      toast.success(t.emails.statusLabel.queued);
      router.refresh();
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt(t.emails.cancelPrompt, t.emails.cancelDefaultReason);
    if (!reason) return;
    setBusy(true);
    const res = await cancelEmailAction(id, reason);
    setBusy(false);
    if (!res.ok) toast.error(res.error);
    else {
      toast.success("Đã hủy");
      router.refresh();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status === "pending_approval" && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleApprove}
          disabled={busy}
          className="h-7 gap-1"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {t.emails.action.approve}
        </Button>
      )}
      {status === "queued" && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleSendNow}
          disabled={busy}
          className="h-7 gap-1"
        >
          <Send className="h-3.5 w-3.5" aria-hidden /> {t.emails.action.sendNow}
        </Button>
      )}
      {status === "failed" && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetry}
          disabled={busy}
          className="h-7 gap-1"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden /> {t.emails.action.retry}
        </Button>
      )}
      {(status === "queued" || status === "pending_approval") && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={busy}
          className="h-7 gap-1 text-rose-600 hover:bg-rose-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden /> {t.emails.action.cancel}
        </Button>
      )}
    </div>
  );
}
