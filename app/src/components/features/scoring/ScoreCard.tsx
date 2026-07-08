"use client";

import * as React from "react";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import {
  CRITERION_CODES,
  type CriterionCode,
  type VerifiedCriteria,
  type Weights,
} from "@/lib/ai/gemini/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/vi-format";
import { EvidenceChip } from "./EvidenceChip";
import { RescoreButton } from "./RescoreButton";

interface Props {
  candidateId: string;
  /** 0..100 weighted total (already computed server-side). */
  total: number;
  criteria: VerifiedCriteria;
  weights: Weights;
  summary?: string | null;
  scoredAt: string;
  /** Show "weights changed" hint above the card if the latest screening pre-dates a weight change. */
  weightsChanged?: boolean;
}

// Plain-language verdict bands (2026-07-08 redesign — the six side-by-side
// bars read as intimidating; HR wants an answer, not a dashboard).
function verdictOf(total: number): { label: string; className: string } {
  if (total >= 75) return { label: "Phù hợp cao", className: "bg-emerald-100 text-emerald-800" };
  if (total >= 55) return { label: "Phù hợp trung bình", className: "bg-amber-100 text-amber-800" };
  return { label: "Phù hợp thấp", className: "bg-rose-100 text-rose-700" };
}

function scoreChipClass(score: number): string {
  if (score >= 70) return "bg-emerald-50 text-emerald-700";
  if (score >= 55) return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

/** One line of grounding for a criterion: first verified quote, else reasoning. */
function snippetOf(criteria: VerifiedCriteria, code: CriterionCode): string {
  const r = criteria[code];
  const quote = r.evidence_quotes.find((q) => q.verified) ?? r.evidence_quotes[0];
  const text = (quote?.text || r.reasoning || "").trim();
  return text.length > 110 ? `${text.slice(0, 110)}…` : text;
}

export function ScoreCard({
  candidateId,
  total,
  criteria,
  weights,
  summary,
  scoredAt,
  weightsChanged,
}: Props) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const scored = CRITERION_CODES.map((code) => ({ code, score: criteria[code]?.score ?? 0 }));
  const strengths = scored
    .filter((c) => c.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  let concerns = scored
    .filter((c) => c.score < 55)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  let concernsTitle = "Cần lưu ý";
  if (concerns.length === 0) {
    // Everything scored decently — still surface the weakest link so HR
    // knows what to probe in the interview.
    concerns = [...scored].sort((a, b) => a.score - b.score).slice(0, 1);
    concernsTitle = "Điểm thấp nhất";
  }

  const verdict = verdictOf(total);
  const t100 = Math.max(0, Math.min(100, Math.round(total)));

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      {weightsChanged ? (
        <p className="rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          {t.score.weightsChanged}
        </p>
      ) : null}

      {/* Verdict — the answer first */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-4xl font-extrabold tabular-nums leading-none text-brand-900">
          {t100}
        </span>
        <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", verdict.className)}>
          {verdict.label}
        </span>
        <span className="text-xs text-slate-400">
          {t.score.scoredAt}: <time dateTime={scoredAt}>{formatRelative(scoredAt)}</time>
        </span>
      </div>
      {summary ? (
        <p className="text-sm text-slate-600" lang="vi">
          {summary}
        </p>
      ) : null}

      {/* Strengths / concerns — plain language, grounded in the CV */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-emerald-100 bg-emerald-50/40 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <Check className="h-3.5 w-3.5" aria-hidden /> Điểm mạnh
          </p>
          {strengths.length > 0 ? (
            <ul className="space-y-2">
              {strengths.map(({ code, score }) => (
                <HighlightItem key={code} code={code} score={score} criteria={criteria} />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Chưa có tiêu chí nào đạt mức nổi bật.</p>
          )}
        </div>
        <div className="rounded-md border border-amber-100 bg-amber-50/40 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {concernsTitle}
          </p>
          <ul className="space-y-2">
            {concerns.map(({ code, score }) => (
              <HighlightItem key={code} code={code} score={score} criteria={criteria} />
            ))}
          </ul>
        </div>
      </div>

      {/* Full 6-criterion detail — collapsed by default */}
      <div className="rounded-md border border-slate-200">
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          aria-expanded={detailsOpen}
        >
          Xem chi tiết 6 tiêu chí
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform",
              detailsOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {detailsOpen ? (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {CRITERION_CODES.map((code) => (
              <CriterionRow
                key={code}
                code={code}
                weight={weights[code] ?? 0}
                result={criteria[code]}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Footer — model/token internals live in Cài đặt → Hệ thống,
          not in front of HR (Sanh, 2026-07-06). */}
      <div className="flex justify-end border-t border-slate-100 pt-3">
        <RescoreButton candidateId={candidateId} variant="rescore" />
      </div>
    </div>
  );
}

function HighlightItem({
  code,
  score,
  criteria,
}: {
  code: CriterionCode;
  score: number;
  criteria: VerifiedCriteria;
}) {
  const snippet = snippetOf(criteria, code);
  return (
    <li className="text-sm">
      <span className="flex items-center gap-2">
        <span className="font-medium text-slate-800">{t.criterion[code]}</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
            scoreChipClass(score),
          )}
        >
          {Math.round(score)}
        </span>
      </span>
      {snippet ? (
        <span className="mt-0.5 block text-xs text-slate-500" lang="vi">
          {snippet}
        </span>
      ) : null}
    </li>
  );
}

function CriterionRow({
  code,
  weight,
  result,
}: {
  code: CriterionCode;
  weight: number;
  result: {
    score: number;
    reasoning: string;
    evidence_quotes: Array<{ text: string; verified: boolean }>;
  };
}) {
  const [open, setOpen] = React.useState(false);
  const score = Math.max(0, Math.min(100, result.score));
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{t.criterion[code]}</span>
        <span className="text-xs text-slate-400">{Math.round(weight * 100)}%</span>
        <span
          className={cn(
            "w-10 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums",
            scoreChipClass(score),
          )}
        >
          {score}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-2 bg-slate-50/60 px-3 py-2 text-xs">
          {result.reasoning ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t.score.reasoning}
              </p>
              <p className="text-slate-700" lang="vi">
                {result.reasoning}
              </p>
            </div>
          ) : null}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Bằng chứng
            </p>
            {result.evidence_quotes.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {result.evidence_quotes.map((q, i) => (
                  <EvidenceChip key={i} text={q.text} verified={q.verified} />
                ))}
              </div>
            ) : (
              <p className="text-slate-400">{t.score.noEvidence}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
