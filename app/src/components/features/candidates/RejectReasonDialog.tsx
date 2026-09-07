"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REJECTION_REASONS, type RejectionReason } from "@/lib/stages";
import { t } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  /** Called with the chosen reason + optional note when the user confirms. */
  onConfirm: (reason: RejectionReason, note: string) => Promise<void> | void;
  busy?: boolean;
}

/**
 * Renovation R1: rejecting now REQUIRES a reason, so an offer decline, a
 * screen-out, and a not-approved never collapse into one undifferentiated
 * "Từ chối" (audit — the single most overloaded status).
 */
export function RejectReasonDialog({ open, onOpenChange, candidateName, onConfirm, busy }: Props) {
  const [reason, setReason] = React.useState<RejectionReason>("screened_out");
  const [note, setNote] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Từ chối: {candidateName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">Lý do từ chối</legend>
            {REJECTION_REASONS.filter((r) => r !== "offer_declined").map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="reject-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-accent-400"
                />
                {t.rejectionReason[r]}
              </label>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">Ghi chú (không bắt buộc)</Label>
            <Textarea
              id="reject-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="VD: kinh nghiệm chưa đủ, mức lương không khớp…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Hủy
          </Button>
          <Button
            variant="navy"
            onClick={() => void onConfirm(reason, note)}
            disabled={busy}
            className="text-rose-50"
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Xác nhận từ chối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
