"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { t } from "@/lib/i18n";
import type { SourceEffectivenessRow } from "@/server/reports/types";

const SOURCE_LABEL: Record<string, string> = {
  manual_upload: "Tải thủ công",
  email_inbox: "Email",
  csv_import: "Nhập CSV",
  topcv_api: "TopCV API",
  referral: "Giới thiệu",
};

export function SourceEffectivenessTable({ rows }: { rows: SourceEffectivenessRow[] }) {
  return (
    <div className="h-72 w-full overflow-y-auto">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">
        {t.reports.charts.sourceEffectiveness}
      </h3>

      {rows.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-slate-400">
          Chưa có dữ liệu
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Nguồn</th>
              <th className="px-2 py-1.5 text-right font-medium">CV</th>
              <th className="px-2 py-1.5 text-right font-medium">Tuyển</th>
              <th className="px-2 py-1.5 text-right font-medium">Tỷ lệ</th>
              <th className="px-2 py-1.5 text-right font-medium">TG TB</th>
              <th className="px-2 py-1.5 text-right font-medium">Điểm AI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.source}>
                <td className="px-2 py-2 font-medium text-slate-900">
                  {SOURCE_LABEL[r.source] ?? r.source}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                  {r.candidates_in}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">{r.hires_out}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  <HireRatePill rate={r.hire_rate} />
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                  {r.avg_days_to_hire != null ? `${r.avg_days_to_hire.toFixed(1)}d` : "—"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                  {r.avg_ai_score != null ? r.avg_ai_score.toFixed(1) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function HireRatePill({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const colorClass =
    pct >= 30
      ? "bg-success-bg text-success-fg"
      : pct >= 15
        ? "bg-warning-bg text-warning-fg"
        : pct === 0
          ? "bg-slate-100 text-slate-500"
          : "bg-danger-bg text-danger-fg";
  const Arrow = pct >= 15 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${colorClass}`}>
      <Arrow className="h-3 w-3" aria-hidden /> {pct}%
    </span>
  );
}
