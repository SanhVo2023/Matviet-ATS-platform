"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { CriterionCode, VerifiedCriterionResult } from "@/lib/ai/gemini/types";
import { EvidenceChip } from "./EvidenceChip";

interface Props {
  code: CriterionCode;
  weight: number; // 0..1
  result: VerifiedCriterionResult;
}

export function CriterionBar({ code, weight, result }: Props) {
  const [open, setOpen] = React.useState(false);
  const score = Math.max(0, Math.min(100, result.score));
  const weightPct = Math.round(weight * 100);

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-slate-700">{t.criterion[code]}</span>
            <span className="text-xs text-slate-500">
              <span className="font-semibold tabular-nums text-brand-900">{score}</span>
              <span className="text-slate-400"> · {weightPct}%</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-brand-900/10">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${score}%` }}
              aria-hidden
            />
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-slate-100 px-3 py-2 text-xs">
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
