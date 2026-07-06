"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decideApprovalAction } from "./actions";

interface Props {
  approvalId: string;
  candidateName: string;
}

/**
 * One-tap approve / reject right in the inbox row (ADR 0015) — managers on
 * the store floor decide from their phone without opening the candidate.
 * Reject asks for an optional reason first; authorization is enforced
 * server-side in decideApproval.
 */
export function InlineDecide({ approvalId, candidateName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"approved" | "rejected" | null>(null);
  const [rejecting, setRejecting] = React.useState(false);
  const [note, setNote] = React.useState("");

  const decide = async (decision: "approved" | "rejected") => {
    setBusy(decision);
    try {
      const res = await decideApprovalAction(approvalId, decision, note.trim() || undefined);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        decision === "approved" ? `Đã duyệt ${candidateName}` : `Đã từ chối ${candidateName}`,
      );
      setRejecting(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  if (rejecting) {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-72">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Lý do từ chối (không bắt buộc)"
          className="text-xs"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void decide("rejected")}
            disabled={busy !== null}
          >
            {busy === "rejected" && (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
            )}
            Xác nhận từ chối
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRejecting(false)}
            disabled={busy !== null}
          >
            Hủy
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        size="sm"
        variant="navy"
        onClick={() => void decide("approved")}
        disabled={busy !== null}
        aria-label={`Duyệt ${candidateName}`}
      >
        {busy === "approved" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Check className="h-3.5 w-3.5" aria-hidden />
        )}
        Duyệt
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setRejecting(true)}
        disabled={busy !== null}
        aria-label={`Từ chối ${candidateName}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Từ chối
      </Button>
    </div>
  );
}
