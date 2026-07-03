"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_COLORS,
  CHART_GRID_STROKE,
  CHART_TICK_FILL,
  CHART_TOOLTIP_STYLE,
} from "@/lib/charts/colors";
import { t } from "@/lib/i18n";
import type { HiresPerMonthRow } from "@/server/reports/types";

const VN_MONTHS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

export function HiresPerMonthChart({ data }: { data: HiresPerMonthRow[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Chưa có ai được tuyển trong khoảng này
      </div>
    );
  }

  const chartData = data.map((d) => {
    const m = new Date(d.month_bucket);
    return {
      month: `${VN_MONTHS[m.getUTCMonth()]} ${m.getUTCFullYear() % 100}`,
      count: d.hire_count,
    };
  });

  const total = chartData.reduce((a, b) => a + b.count, 0);

  return (
    <div className="h-72 w-full">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">
        {t.reports.charts.hiresPerMonth}{" "}
        <span className="text-xs text-slate-400">({total} người)</span>
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
          <defs>
            <linearGradient id="hiresArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.emerald} stopOpacity={0.4} />
              <stop offset="100%" stopColor={CHART_COLORS.emerald} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART_TICK_FILL }} />
          <YAxis tick={{ fontSize: 11, fill: CHART_TICK_FILL }} allowDecimals={false} />
          <Tooltip
            formatter={(value: number) => [`${value} người`, "Đã tuyển"]}
            labelClassName="font-semibold"
            contentStyle={CHART_TOOLTIP_STYLE}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={CHART_COLORS.emerald}
            strokeWidth={2}
            fill="url(#hiresArea)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
