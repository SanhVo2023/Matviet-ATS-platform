"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CRITERION_CODES, type VerifiedCriteria, type Weights } from "@/lib/ai/gemini/types";
import { t } from "@/lib/i18n";
import { formatRelative } from "@/lib/vi-format";
import { CriterionBar } from "./CriterionBar";
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

export function ScoreCard({
  candidateId,
  total,
  criteria,
  weights,
  summary,
  scoredAt,
  weightsChanged,
}: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      {weightsChanged ? (
        <p className="rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          {t.score.weightsChanged}
        </p>
      ) : null}

      {/* Header — overall score */}
      <div className="flex flex-wrap items-center gap-4">
        <CircularScore total={total} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.score.overall}
          </p>
          {summary ? (
            <p className="mt-1 text-sm italic text-slate-600" lang="vi">
              {summary}
            </p>
          ) : null}
        </div>
      </div>

      {/* 6 bars */}
      <div className="space-y-2">
        {CRITERION_CODES.map((code, i) => (
          <motion.div
            key={code}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.2 }}
          >
            <CriterionBar code={code} weight={weights[code] ?? 0} result={criteria[code]} />
          </motion.div>
        ))}
      </div>

      {/* Footer — meta. Model/token internals live in Cài đặt → Hệ thống,
          not in front of HR (Sanh, 2026-07-06). */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>
          {t.score.scoredAt}: <time dateTime={scoredAt}>{formatRelative(scoredAt)}</time>
        </span>
        <RescoreButton candidateId={candidateId} variant="rescore" />
      </div>
    </div>
  );
}

function CircularScore({ total }: { total: number }) {
  const reduceMotion = useReducedMotion();
  const t100 = Math.max(0, Math.min(100, Math.round(total)));
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - t100 / 100);
  return (
    <div className="relative grid h-20 w-20 place-items-center">
      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          className="text-brand-900/10"
          strokeWidth="6"
          fill="none"
        />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          className="text-accent-400"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduceMotion ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>
      <span className="absolute text-xl font-extrabold tabular-nums text-brand-900">{t100}</span>
    </div>
  );
}
