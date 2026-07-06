"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Wand2, Sparkles, Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";
import {
  SCORING_CRITERION_CODES,
  DEFAULT_WEIGHT_TEMPLATES,
  type CriterionCode,
} from "@/lib/constants";
import { suggestWeightsAction } from "@/app/(dashboard)/tin-tuyen-dung/actions";
import type { JobInput, Weights } from "@/lib/validation/job";

const CRITERION_DESCRIPTION: Record<CriterionCode, string> = {
  industry_fit: "Phù hợp ngành (bán lẻ, quang học, dịch vụ).",
  professional_skills: "Kỹ năng chuyên môn cho vị trí.",
  work_experience: "Chất lượng và sự liên quan của công việc trước.",
  years_experience: "Số năm kinh nghiệm phù hợp.",
  education: "Trình độ học vấn / chứng chỉ liên quan.",
  location: "Khoảng cách / địa điểm làm việc.",
};

const TEMPLATE_LABELS: Record<keyof typeof DEFAULT_WEIGHT_TEMPLATES, string> = {
  sales: t.roleFamily.sales,
  optician: t.roleFamily.optician,
  office: t.roleFamily.office,
  manager: t.roleFamily.manager,
};

const pctOf = (w: Weights | undefined, k: CriterionCode) =>
  Math.round(((w?.[k] ?? 0) as number) * 100);

/**
 * Weights editor v2 (Sanh 2026-07-06: "the slider makes this part hard").
 * Moving ONE slider auto-rebalances the other five proportionally so the
 * total is ALWAYS exactly 100% — the invalid state can no longer be reached
 * by dragging. Plus "AI đề xuất": suggests a distribution from the job
 * title/description.
 */
export function WeightsEditor() {
  const { watch, setValue } = useFormContext<JobInput>();
  const weights = watch("weights");
  const title = watch("title");
  const roleFamily = watch("role_family");
  const description = watch("description");
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiNote, setAiNote] = React.useState<string | null>(null);

  const sumPct = SCORING_CRITERION_CODES.reduce((acc, k) => acc + pctOf(weights, k), 0);

  /**
   * Auto-balance: slider k moves to `newPct`; the remaining (100 − newPct)
   * is split across the other five proportionally to their current values
   * (equally when they're all zero), using largest-remainder so integers
   * land on exactly 100.
   */
  const onSlide = (k: CriterionCode, newPct: number) => {
    const v = Math.min(100, Math.max(0, Math.round(newPct)));
    const others = SCORING_CRITERION_CODES.filter((c) => c !== k);
    const cur = others.map((c) => pctOf(weights, c));
    const curSum = cur.reduce((a, b) => a + b, 0);
    const remaining = 100 - v;

    let alloc: number[];
    if (curSum === 0) {
      const base = Math.floor(remaining / others.length);
      alloc = others.map(() => base);
    } else {
      alloc = cur.map((c) => Math.floor((c * remaining) / curSum));
    }
    let leftover = remaining - alloc.reduce((a, b) => a + b, 0);
    const order = [...others.keys()].sort((a, b) => cur[b]! - cur[a]!);
    for (const i of order) {
      if (leftover <= 0) break;
      alloc[i]!++;
      leftover--;
    }

    const next = {} as Record<CriterionCode, number>;
    others.forEach((c, i) => {
      next[c] = alloc[i]! / 100;
    });
    next[k] = v / 100;
    setValue("weights", next as Weights, { shouldDirty: true, shouldValidate: true });
  };

  const applyTemplate = (key: keyof typeof DEFAULT_WEIGHT_TEMPLATES) => {
    setAiNote(null);
    setValue("weights", DEFAULT_WEIGHT_TEMPLATES[key] as Weights, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const suggestWithAi = async () => {
    setAiBusy(true);
    setAiNote(null);
    try {
      const res = await suggestWeightsAction({
        title,
        role_family: roleFamily,
        description: description || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setValue("weights", res.data!.weights as Weights, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setAiNote(res.data!.reasoning);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-700">{t.jobForm.weights.title}</p>
          <p className="text-xs text-slate-500">
            Kéo một thanh — các thanh còn lại tự cân bằng, tổng luôn đúng 100%.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void suggestWithAi()}
            disabled={aiBusy || !title || title.trim().length < 2}
            title={!title || title.trim().length < 2 ? "Nhập chức danh trước" : undefined}
          >
            {aiBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-accent-600" aria-hidden />
            )}
            AI đề xuất
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Wand2 className="h-3.5 w-3.5" aria-hidden /> Áp dụng mẫu{" "}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(
                Object.keys(DEFAULT_WEIGHT_TEMPLATES) as Array<
                  keyof typeof DEFAULT_WEIGHT_TEMPLATES
                >
              ).map((k) => (
                <DropdownMenuItem key={k} onSelect={() => applyTemplate(k)}>
                  {TEMPLATE_LABELS[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {aiNote && (
        <p className="rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-900">
          <Sparkles className="mr-1 inline h-3 w-3 text-accent-600" aria-hidden />
          {aiNote}
        </p>
      )}

      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        {SCORING_CRITERION_CODES.map((k) => (
          <div key={k} className="grid grid-cols-[180px_1fr_60px] items-center gap-3">
            <div>
              <p className="text-sm font-medium text-slate-700">{t.criterion[k]}</p>
              <p className="text-xs text-slate-500">{CRITERION_DESCRIPTION[k]}</p>
            </div>
            <Slider
              value={[pctOf(weights, k)]}
              onValueChange={(v) => onSlide(k, v[0] ?? 0)}
              min={0}
              max={100}
              step={1}
              aria-label={`Trọng số ${t.criterion[k]}`}
            />
            <span className="text-right font-mono text-sm tabular-nums text-slate-600">
              {pctOf(weights, k)}%
            </span>
          </div>
        ))}

        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-sm font-medium text-slate-700">Tổng</span>
          <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-sm font-semibold tabular-nums text-success-fg">
            {sumPct}%
          </span>
        </div>
      </div>
    </div>
  );
}
