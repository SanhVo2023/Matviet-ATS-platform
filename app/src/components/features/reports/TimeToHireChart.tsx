"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import type { TimeToHireGrouped } from "@/server/reports/types";

const ROLE_LABEL: Record<string, string> = {
  sales: "Bán hàng",
  optician: "Khúc xạ",
  office: "Văn phòng",
  manager: "Quản lý",
  custom: "Khác",
};

export function TimeToHireChart({ data }: { data: TimeToHireGrouped[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Chưa có ai được tuyển trong khoảng này
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: ROLE_LABEL[d.role_family ?? "custom"] ?? "Khác",
    median: d.median_days,
    p90: d.p90_days,
    count: d.hire_count,
  }));

  return (
    <div className="h-72 w-full">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">
        {t.reports.charts.timeToHire} <span className="text-xs text-slate-400">(ngày)</span>
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_TICK_FILL }} />
          <YAxis tick={{ fontSize: 11, fill: CHART_TICK_FILL }} />
          <Tooltip
            formatter={(value: number, key: string) => [
              `${value.toFixed(1)} ngày`,
              key === "median" ? "Trung vị" : "P90",
            ]}
            labelClassName="font-semibold"
            contentStyle={CHART_TOOLTIP_STYLE}
            cursor={{ fill: "#f3f5fa" }}
          />
          <Bar dataKey="median" name="Trung vị" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS.primary} />
            ))}
          </Bar>
          <Bar dataKey="p90" name="P90" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS.amber} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
