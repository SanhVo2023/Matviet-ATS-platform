"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="h-auto px-2 py-1.5">Nguồn</TableHead>
              <TableHead className="h-auto px-2 py-1.5 text-right">CV</TableHead>
              <TableHead className="h-auto px-2 py-1.5 text-right">Tuyển</TableHead>
              <TableHead className="h-auto px-2 py-1.5 text-right">Tỷ lệ</TableHead>
              <TableHead className="h-auto px-2 py-1.5 text-right">TG TB</TableHead>
              <TableHead className="h-auto px-2 py-1.5 text-right">Điểm AI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.source}>
                <TableCell className="px-2 py-2 font-medium text-slate-900">
                  {SOURCE_LABEL[r.source] ?? r.source}
                </TableCell>
                <TableCell className="px-2 py-2 text-right tabular-nums text-slate-700">
                  {r.candidates_in}
                </TableCell>
                <TableCell className="px-2 py-2 text-right tabular-nums text-slate-700">
                  {r.hires_out}
                </TableCell>
                <TableCell className="px-2 py-2 text-right tabular-nums">
                  <HireRatePill rate={r.hire_rate} />
                </TableCell>
                <TableCell className="px-2 py-2 text-right tabular-nums text-slate-700">
                  {r.avg_days_to_hire != null
                    ? `${r.avg_days_to_hire.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} ngày`
                    : "—"}
                </TableCell>
                <TableCell className="px-2 py-2 text-right tabular-nums text-slate-700">
                  {r.avg_ai_score != null ? r.avg_ai_score.toFixed(1) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
