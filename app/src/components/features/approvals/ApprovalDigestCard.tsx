import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { InlineDecide } from "@/app/(dashboard)/phe-duyet/InlineDecide";
import { formatVND, formatDate } from "@/lib/vi-format";
import { STEP_LABEL_VI } from "@/server/approvals/presets";
import type { PendingApprovalDigest } from "@/server/approvals/repository";

/**
 * Exec decision card (renovation R2): the approver decides from real material —
 * AI score, interview tally, proposed terms, a 2-line CV summary — with the
 * approve/reject controls inline. "Xem đầy đủ" opens the read-only candidate
 * view for depth. Replaces the name-only row execs used to approve blind.
 */
export function ApprovalDigestCard({ d }: { d: PendingApprovalDigest }) {
  const tally = d.eval;
  const salaryRange =
    d.salary_min || d.salary_max
      ? `${formatVND(d.salary_min)}${d.salary_max ? ` – ${formatVND(d.salary_max)}` : ""}`
      : null;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-brand-900">
              {d.candidate_name ?? "—"}
            </p>
            <p className="truncate text-sm text-slate-500">
              {d.job_title ?? "—"} · {STEP_LABEL_VI[d.step_kind]}
            </p>
          </div>
          {d.ai_score != null ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-brand-900 px-2.5 py-1 text-sm font-semibold tabular-nums text-accent-400">
              {Math.round(d.ai_score)}
            </span>
          ) : null}
        </div>

        {/* Decision facts */}
        <dl className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-slate-500">Phỏng vấn:</dt>
            <dd className="text-slate-800">
              {d.interview_count} buổi
              {tally.count > 0
                ? ` · ${tally.strong_yes + tally.yes} đồng ý, ${tally.maybe} phân vân, ${tally.no} từ chối`
                : " · chưa có đánh giá"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500">Đề xuất lương:</dt>
            <dd className="text-slate-800">
              {tally.proposed_salary != null ? formatVND(tally.proposed_salary) : "—"}
            </dd>
          </div>
          {salaryRange ? (
            <div className="flex gap-2">
              <dt className="text-slate-500">Khung lương vị trí:</dt>
              <dd className="text-slate-800">{salaryRange}</dd>
            </div>
          ) : null}
          {d.expected_start_date ? (
            <div className="flex gap-2">
              <dt className="text-slate-500">Ngày nhận việc:</dt>
              <dd className="text-slate-800">{formatDate(d.expected_start_date)}</dd>
            </div>
          ) : null}
        </dl>

        {d.ai_summary ? (
          <p className="line-clamp-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {d.ai_summary}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <InlineDecide approvalId={d.id} candidateName={d.candidate_name ?? "ứng viên"} />
          <Link
            href={`/ung-vien/${d.candidate_id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
          >
            Xem đầy đủ
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
