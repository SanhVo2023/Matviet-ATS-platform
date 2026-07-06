"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  token: string;
  candidateName: string;
  jobTitle: string;
  responded: "accepted" | "declined" | null;
}

/**
 * The accept/decline interaction on the public offer page. Two-step for
 * decline (asks an optional reason) and for accept (asks the preferred
 * start date) so a single tap can't fire an irreversible answer.
 */
export function OfferResponseCard({ token, candidateName, jobTitle, responded }: Props) {
  const [outcome, setOutcome] = React.useState<"accepted" | "declined" | null>(responded);
  const [mode, setMode] = React.useState<"choose" | "accept" | "decline">("choose");
  const [startDate, setStartDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (decision: "accepted" | "declined") => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/offer/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          decision,
          expected_start_date: decision === "accepted" ? startDate || null : null,
          note: decision === "declined" ? note || null : null,
        }),
      });
      const data = (await res.json()) as { ok: boolean; outcome?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Có lỗi xảy ra, vui lòng thử lại");
        return;
      }
      setOutcome(data.outcome as "accepted" | "declined");
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  if (outcome === "accepted") {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <PartyPopper className="h-10 w-10 text-accent-500" aria-hidden />
        <h1 className="text-xl font-bold text-brand-900">Chào mừng bạn gia nhập Mắt Việt!</h1>
        <p className="text-sm text-slate-600">
          Chúng tôi đã ghi nhận xác nhận nhận việc của bạn cho vị trí <strong>{jobTitle}</strong>.
          Phòng Nhân sự sẽ liên hệ với bạn về thủ tục tiếp theo.
        </p>
      </div>
    );
  }
  if (outcome === "declined") {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-slate-400" aria-hidden />
        <h1 className="text-xl font-bold text-brand-900">Đã ghi nhận phản hồi của bạn</h1>
        <p className="text-sm text-slate-600">
          Cảm ơn bạn đã dành thời gian cho Mắt Việt. Chúc bạn thành công trên con đường sắp tới!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-bold text-brand-900">Thư mời nhận việc</h1>
        <p className="mt-2 text-sm text-slate-600">
          Chào <strong>{candidateName}</strong>, Mắt Việt trân trọng mời bạn đảm nhận vị trí{" "}
          <strong>{jobTitle}</strong>. Vui lòng xác nhận quyết định của bạn bên dưới.
        </p>
      </div>

      {mode === "choose" && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" onClick={() => setMode("accept")} disabled={submitting}>
            <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
            Tôi nhận việc
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setMode("decline")}
            disabled={submitting}
          >
            <XCircle className="mr-2 h-4 w-4" aria-hidden />
            Tôi từ chối
          </Button>
        </div>
      )}

      {mode === "accept" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="start-date">Ngày bắt đầu mong muốn (không bắt buộc)</Label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void submit("accepted")} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Xác nhận nhận việc
            </Button>
            <Button variant="ghost" onClick={() => setMode("choose")} disabled={submitting}>
              Quay lại
            </Button>
          </div>
        </div>
      )}

      {mode === "decline" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="decline-note">Lý do (không bắt buộc)</Label>
            <Textarea
              id="decline-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Chia sẻ của bạn giúp chúng tôi cải thiện quy trình tuyển dụng"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => void submit("declined")}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Xác nhận từ chối
            </Button>
            <Button variant="ghost" onClick={() => setMode("choose")} disabled={submitting}>
              Quay lại
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
