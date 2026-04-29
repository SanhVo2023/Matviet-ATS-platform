"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { manualScoreAction } from "@/app/(dashboard)/ung-vien/[id]/actions";
import { CRITERION_CODES, type CriterionCode, type Weights } from "@/lib/ai/gemini/types";
import { t } from "@/lib/i18n";

interface Props {
  candidateId: string;
  weights: Weights;
  /** Optional starting values from a previous failed attempt or HR override. */
  initialScores?: Partial<Record<CriterionCode, number>>;
}

const DEFAULT_SCORE = 60;

export function ManualScoreSliders({ candidateId, weights, initialScores }: Props) {
  const router = useRouter();
  const [scores, setScores] = React.useState<Record<CriterionCode, number>>(
    () =>
      Object.fromEntries(
        CRITERION_CODES.map((k) => [k, initialScores?.[k] ?? DEFAULT_SCORE]),
      ) as Record<CriterionCode, number>,
  );
  const [reasoning, setReasoning] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const expectedTotal = React.useMemo(() => {
    let s = 0;
    for (const k of CRITERION_CODES) s += (scores[k] ?? 0) * (weights[k] ?? 0);
    return Math.round(s * 10) / 10;
  }, [scores, weights]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await manualScoreAction({
        candidate_id: candidateId,
        scores,
        reasoning: reasoning.trim() || undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t.success.scoreUpdated);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{t.score.manual}</p>
        <p className="text-xs text-slate-500">
          {t.score.expectedTotal}:{" "}
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {expectedTotal}
          </span>
        </p>
      </div>
      <p className="text-xs text-slate-500">{t.score.manualHint}</p>

      <div className="space-y-3">
        {CRITERION_CODES.map((k) => {
          const wPct = Math.round((weights[k] ?? 0) * 100);
          return (
            <div key={k} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-slate-700">{t.criterion[k]}</span>
                <span className="text-slate-500">
                  <span className="font-mono tabular-nums">{scores[k]}</span>{" "}
                  <span className="text-slate-400">· {wPct}%</span>
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[scores[k] ?? 0]}
                onValueChange={(v) => setScores((s) => ({ ...s, [k]: v[0] ?? 0 }))}
              />
            </div>
          );
        })}
      </div>

      <Textarea
        rows={2}
        placeholder="Lý giải (tùy chọn)…"
        value={reasoning}
        onChange={(e) => setReasoning(e.target.value)}
        maxLength={500}
        lang="vi"
      />

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Đang lưu…" : t.score.manualSubmit}
        </Button>
      </div>
    </form>
  );
}
