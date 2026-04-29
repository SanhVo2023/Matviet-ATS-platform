"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import {
  SCORING_CRITERION_CODES,
  DEFAULT_WEIGHT_TEMPLATES,
  type CriterionCode,
} from "@/lib/constants";
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

const round2 = (n: number) => Math.round(n * 100) / 100;

export function WeightsEditor() {
  const { watch, setValue, formState } = useFormContext<JobInput>();
  const weights = watch("weights");

  const sum = SCORING_CRITERION_CODES.reduce((acc, k) => acc + (weights?.[k] ?? 0), 0);
  const sumPct = Math.round(sum * 100);
  const isValid = Math.abs(sum - 1) <= 0.001;

  const setWeight = (k: CriterionCode, val: number) => {
    setValue(`weights.${k}`, round2(val), { shouldDirty: true, shouldValidate: true });
  };

  const applyTemplate = (key: keyof typeof DEFAULT_WEIGHT_TEMPLATES) => {
    const tpl = DEFAULT_WEIGHT_TEMPLATES[key] as Weights;
    setValue("weights", tpl, { shouldDirty: true, shouldValidate: true });
  };

  /** Distribute remaining weight equally to non-current sliders to make sum = 1.0. */
  const normalize = () => {
    if (sum === 0) return;
    const factor = 1 / sum;
    const next = Object.fromEntries(
      SCORING_CRITERION_CODES.map((k) => [k, round2((weights?.[k] ?? 0) * factor)]),
    ) as unknown as Weights;
    setValue("weights", next, { shouldDirty: true, shouldValidate: true });
  };

  const errorMessage = formState.errors.weights?.message;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-700">{t.jobForm.weights.title}</p>
          <p className="text-xs text-slate-500">
            6 tiêu chí cộng lại 100%. Có thể tải mẫu theo loại vị trí.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          {!isValid && sum !== 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={normalize}>
              Chuẩn hóa về 100%
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        {SCORING_CRITERION_CODES.map((k) => (
          <div key={k} className="grid grid-cols-[180px_1fr_60px] items-center gap-3">
            <div>
              <p className="text-sm font-medium text-slate-700">{t.criterion[k]}</p>
              <p className="text-xs text-slate-500">{CRITERION_DESCRIPTION[k]}</p>
            </div>
            <Slider
              value={[Math.round((weights?.[k] ?? 0) * 100)]}
              onValueChange={(v) => setWeight(k, (v[0] ?? 0) / 100)}
              min={0}
              max={100}
              step={1}
              aria-label={`Trọng số ${t.criterion[k]}`}
            />
            <span className="text-right font-mono text-sm tabular-nums text-slate-600">
              {Math.round((weights?.[k] ?? 0) * 100)}%
            </span>
          </div>
        ))}

        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-sm font-medium text-slate-700">Tổng</span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums",
              isValid ? "bg-success-bg text-success-fg" : "bg-error-bg/40 text-error-fg",
            )}
          >
            {sumPct}%
          </span>
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm text-error-fg">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
