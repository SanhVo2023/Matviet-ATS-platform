"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CV_ACCEPTED_MIMES } from "@/lib/storage/paths";
import { changeCandidateCvAction } from "@/app/(dashboard)/ung-vien/[id]/actions";

/**
 * Re-upload / replace a candidate's CV (admin/hr). The new file replaces the
 * candidate's active CV, wipes the old AI analysis, and triggers a fresh
 * AI screening automatically.
 */
export function ChangeCvButton({
  candidateId,
  label = "Đổi CV",
}: {
  candidateId: string;
  label?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("cv", file);
      const r = await changeCandidateCvAction(candidateId, fd);
      if (r.ok) {
        toast.success("Đã cập nhật CV — AI đang chấm điểm lại.");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={CV_ACCEPTED_MIMES.join(",")}
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0])}
        aria-hidden
        tabIndex={-1}
      />
      <Button variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="h-4 w-4" aria-hidden />
        )}
        {label}
      </Button>
    </>
  );
}
