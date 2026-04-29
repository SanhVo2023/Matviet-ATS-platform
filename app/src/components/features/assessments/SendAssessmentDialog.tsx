"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Send } from "lucide-react";
import { toast } from "sonner";
import { SlideOver } from "@/components/primitives/SlideOver";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/vi-format";
import { sendAssessmentAction } from "@/app/(dashboard)/ung-vien/[id]/actions";

export function SendAssessmentTrigger({
  candidateId,
  candidateName,
  assessmentId,
}: {
  candidateId: string;
  candidateName: string;
  assessmentId: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Send className="h-4 w-4" aria-hidden /> {t.assessment.send}
      </Button>
      <SendAssessmentDialog
        open={open}
        onOpenChange={setOpen}
        candidateId={candidateId}
        candidateName={candidateName}
        assessmentId={assessmentId}
      />
    </>
  );
}

function SendAssessmentDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  assessmentId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidateId: string;
  candidateName: string;
  assessmentId: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{
    signed_link: string;
    deadline_at: string;
  } | null>(null);

  React.useEffect(() => {
    if (open) setResult(null);
  }, [open]);

  const handleSend = async () => {
    setSubmitting(true);
    const res = await sendAssessmentAction({
      candidate_id: candidateId,
      assessment_id: assessmentId,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (res.data) {
      setResult({ signed_link: res.data.signed_link, deadline_at: res.data.deadline_at });
      toast.success("Đã đặt vào hàng chờ email.");
      router.refresh();
    }
  };

  const copyLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.signed_link);
      toast.success(t.assessment.copied);
    } catch {
      toast.error("Không sao chép được");
    }
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t.assessment.sendDialogTitle}
      description={`Ứng viên: ${candidateName}`}
      width="md"
    >
      <SlideOver.Body>
        {!result ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t.assessment.sendDialogDescription}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Tạo liên kết bảo mật, hợp lệ trong 48 giờ</li>
              <li>Đặt email thông báo vào hàng chờ (G6 sẽ gửi tự động khi IT cấu hình xong)</li>
              <li>Trong khi chờ G6, sao chép link và dán vào Outlook để gửi tay</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-900">Đã gửi vào hàng chờ email</p>
              <p className="mt-1 text-xs text-emerald-800">
                {`${t.assessment.deadlineHint} ${formatDateTime(result.deadline_at)}`}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                {t.assessment.copyLinkHint}
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={result.signed_link}
                  className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
                  onFocus={(e) => e.target.select()}
                />
                <Button onClick={copyLink} variant="outline" className="gap-1">
                  <Copy className="h-3.5 w-3.5" aria-hidden /> {t.assessment.copyLink}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SlideOver.Body>
      <SlideOver.Footer>
        {!result ? (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t.action.cancel}
            </Button>
            <Button onClick={handleSend} disabled={submitting}>
              {submitting ? "Đang gửi…" : t.action.send}
            </Button>
          </>
        ) : (
          <Button onClick={() => onOpenChange(false)}>{t.action.confirm}</Button>
        )}
      </SlideOver.Footer>
    </SlideOver>
  );
}
