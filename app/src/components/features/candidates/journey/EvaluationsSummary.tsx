import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatVND, formatDate } from "@/lib/vi-format";
import type { CandidateEvaluationRow } from "@/server/interviews/repository";

const REC_CHIP: Record<string, string> = {
  strong_yes: "bg-emerald-100 text-emerald-800",
  yes: "bg-emerald-50 text-emerald-700",
  maybe: "bg-amber-50 text-amber-700",
  no: "bg-rose-50 text-rose-700",
};

/** "n/total đề xuất tuyển" — positive = strong_yes | yes. */
export function evaluationTally(evaluations: CandidateEvaluationRow[]): {
  positive: number;
  total: number;
} {
  const withRec = evaluations.filter((e) => e.recommendation != null);
  return {
    positive: withRec.filter((e) => e.recommendation === "strong_yes" || e.recommendation === "yes")
      .length,
    total: withRec.length,
  };
}

/**
 * The manager's "how did the interviews go" digest (ADR 0019): one row per
 * evaluator with their recommendation chip, strengths/concerns, and proposed
 * salary — previously only visible by opening each interview page.
 */
export function EvaluationsSummary({
  evaluations,
  names,
}: {
  evaluations: CandidateEvaluationRow[];
  names: Record<string, string>;
}) {
  if (evaluations.length === 0) return null;
  const { positive, total } = evaluationTally(evaluations);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Đánh giá phỏng vấn
        {total > 0 ? (
          <span
            className={cn(
              "ml-2 rounded-full px-2 py-0.5 font-semibold normal-case tracking-normal",
              positive === total ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
            )}
          >
            {positive}/{total} đề xuất tuyển
          </span>
        ) : null}
      </p>
      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
        {evaluations.map((e, i) => (
          <li key={`${e.interview_id}-${e.evaluator_user_id}-${i}`} className="px-3 py-2.5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-800">
                {names[e.evaluator_user_id] ?? "—"}
              </span>
              {e.recommendation ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    REC_CHIP[e.recommendation],
                  )}
                >
                  {t.recommendation[e.recommendation]}
                </span>
              ) : null}
              <span className="ml-auto text-xs text-slate-400">
                PV {formatDate(e.scheduled_at)}
              </span>
            </div>
            {e.strengths ? (
              <p className="mt-1 text-xs text-slate-600">
                <span className="font-semibold text-emerald-700">Điểm mạnh:</span> {e.strengths}
              </p>
            ) : null}
            {e.concerns ? (
              <p className="mt-0.5 text-xs text-slate-600">
                <span className="font-semibold text-amber-700">Cân nhắc:</span> {e.concerns}
              </p>
            ) : null}
            {e.proposed_salary != null ? (
              <p className="mt-0.5 text-xs text-slate-600">
                <span className="font-semibold">Lương đề xuất:</span>{" "}
                <span className="font-mono">{formatVND(e.proposed_salary)}</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
