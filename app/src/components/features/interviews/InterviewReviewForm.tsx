"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { REVIEW_CRITERIA, RECOMMENDATIONS, type ReviewCriterion } from "@/lib/validation/interview";
import { submitEvaluationAction, startApprovalAction } from "@/app/(dashboard)/phong-van/actions";
import type { InterviewEvaluationRow } from "@/server/interviews/repository";

interface Props {
  interviewId: string;
  candidateId: string;
  /** If the current user has already submitted, prefill from their existing row. */
  existing?: InterviewEvaluationRow | null;
}

const CRIT_LABEL: Record<ReviewCriterion, string> = {
  technical: t.interview.review.technical,
  soft: t.interview.review.soft,
  experience: t.interview.review.experience,
  culture: t.interview.review.culture,
  potential: t.interview.review.potential,
  attitude: t.interview.review.attitude,
};

const REC_LABEL: Record<(typeof RECOMMENDATIONS)[number], { label: string; tone: string }> = {
  strong_yes: {
    label: t.recommendation.strong_yes,
    tone: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  },
  yes: { label: t.recommendation.yes, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  maybe: { label: t.recommendation.maybe, tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  no: { label: t.recommendation.no, tone: "bg-rose-50 text-rose-700 ring-rose-200" },
};

const DEFAULT_SCORE = 70;

export function InterviewReviewForm({ interviewId, candidateId, existing }: Props) {
  const router = useRouter();
  const initialScores = (existing?.scores ?? {}) as Partial<Record<ReviewCriterion, number>>;

  const [scores, setScores] = React.useState<Record<ReviewCriterion, number>>(
    () =>
      Object.fromEntries(
        REVIEW_CRITERIA.map((k) => [k, initialScores[k] ?? DEFAULT_SCORE]),
      ) as Record<ReviewCriterion, number>,
  );
  const [strengths, setStrengths] = React.useState(existing?.strengths ?? "");
  const [concerns, setConcerns] = React.useState(existing?.concerns ?? "");
  const [salary, setSalary] = React.useState<string>(
    existing?.proposed_salary != null ? String(existing.proposed_salary) : "",
  );
  const [recommendation, setRecommendation] = React.useState<
    (typeof RECOMMENDATIONS)[number] | null
  >((existing?.recommendation as (typeof RECOMMENDATIONS)[number] | undefined) ?? null);
  const [internalNotes, setInternalNotes] = React.useState(existing?.internal_notes ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [proposingApproval, setProposingApproval] = React.useState(false);

  const canSubmit = recommendation != null && !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendation) {
      toast.error("Vui lòng chọn khuyến nghị");
      return;
    }
    setSubmitting(true);
    const res = await submitEvaluationAction({
      interview_id: interviewId,
      scores,
      strengths: strengths.trim() || undefined,
      concerns: concerns.trim() || undefined,
      proposed_salary: salary.trim() ? parseInt(salary.replace(/[^0-9]/g, ""), 10) : null,
      recommendation,
      internal_notes: internalNotes.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.success.saved);
    router.refresh();
  };

  const onProposeApproval = async () => {
    setProposingApproval(true);
    const res = await startApprovalAction(candidateId);
    setProposingApproval(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Đã đẩy lên quy trình duyệt.");
    router.refresh();
  };

  const overall = Math.round(
    REVIEW_CRITERIA.reduce((acc, k) => acc + (scores[k] ?? 0), 0) / REVIEW_CRITERIA.length,
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Đánh giá phỏng vấn</h2>
          <p className="text-xs text-slate-500">
            Trung bình:{" "}
            <span className="font-mono text-base font-semibold text-slate-900">{overall}</span>
            <span className="text-slate-400"> /100</span>
          </p>
        </div>

        <div className="space-y-3">
          {REVIEW_CRITERIA.map((k) => (
            <div key={k} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-slate-700">{CRIT_LABEL[k]}</span>
                <span className="font-mono tabular-nums text-slate-600">{scores[k]}</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[scores[k] ?? 0]}
                onValueChange={(v) => setScores((s) => ({ ...s, [k]: v[0] ?? 0 }))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ev-strengths">{t.interview.review.strengths}</Label>
          <Textarea
            id="ev-strengths"
            rows={4}
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            maxLength={2000}
            lang="vi"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-concerns">{t.interview.review.concerns}</Label>
          <Textarea
            id="ev-concerns"
            rows={4}
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            maxLength={2000}
            lang="vi"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ev-salary">{t.interview.review.salaryProposed}</Label>
          <Input
            id="ev-salary"
            inputMode="numeric"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="VD: 12000000"
          />
          <p className="text-[10px] text-slate-400">Đơn vị: đồng. Để trống nếu chưa quyết.</p>
        </div>
        <div className="space-y-2">
          <Label>{t.interview.review.recommendation}</Label>
          <div className="grid grid-cols-2 gap-2">
            {RECOMMENDATIONS.map((r) => {
              const meta = REC_LABEL[r];
              const active = recommendation === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecommendation(r)}
                  className={cn(
                    "rounded-md px-3 py-2 text-left text-xs font-medium ring-1 transition-colors",
                    active
                      ? meta.tone
                      : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300",
                  )}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ev-notes">{t.interview.review.privateNotes}</Label>
        <Textarea
          id="ev-notes"
          rows={3}
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          maxLength={2000}
          placeholder="Ghi chú nội bộ — KHÔNG bao giờ gửi ra ngoài cho ứng viên"
          lang="vi"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="text-xs text-slate-500">
          {existing
            ? "Bạn đã gửi đánh giá trước đó — lưu sẽ ghi đè."
            : "Đánh giá có thể chỉnh sửa sau khi lưu."}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onProposeApproval}
            disabled={proposingApproval || !existing}
            title={!existing ? "Phải lưu đánh giá trước khi đề xuất" : undefined}
          >
            {proposingApproval ? "Đang xử lý..." : "Đẩy lên duyệt"}
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? "Đang lưu..." : t.action.save}
          </Button>
        </div>
      </div>
    </form>
  );
}
