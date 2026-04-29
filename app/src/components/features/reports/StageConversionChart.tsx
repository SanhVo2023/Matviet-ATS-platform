"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { CHART_COLORS } from "@/lib/charts/colors";
import { t } from "@/lib/i18n";
import type { StageConversionRow } from "@/server/reports/types";

const STAGE_SHORT: Record<string, string> = {
  new: "Mới",
  screening: "Sàng",
  screened: "Đã sàng",
  interview_scheduled: "Đặt lịch",
  interviewed: "PV",
  test_sent: "Gửi test",
  test_done: "Đã test",
  recommended: "Đề xuất",
  salary_deal: "Lương",
  bod_review: "BOD",
  tap_doan_review: "Tập đoàn",
  offer_sent: "Offer",
  offer_accepted: "Nhận",
  hired: "Tuyển",
};

export function StageConversionChart({ data }: { data: StageConversionRow[] }) {
  const chartData = data.map((d) => ({
    pair: `${STAGE_SHORT[d.from_stage] ?? d.from_stage}→${STAGE_SHORT[d.to_stage] ?? d.to_stage}`,
    upstream: d.upstream_count,
    crossed: d.crossed_count,
    pct: d.conversion_pct,
  }));

  const total = chartData.reduce((a, b) => a + b.upstream, 0);
  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Chưa có chuyển vòng nào trong khoảng này
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">
        {t.reports.charts.stageConversion}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="pair"
            tick={{ fontSize: 9 }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={70}
          />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<ConvTooltip />} />
          <Bar
            yAxisId="left"
            dataKey="upstream"
            fill={CHART_COLORS.slate}
            name="Vào"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="crossed"
            fill={CHART_COLORS.primary}
            name="Qua"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="pct"
            stroke={CHART_COLORS.amber}
            name="Tỷ lệ chuyển"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ConvTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload as {
    pair: string;
    upstream: number;
    crossed: number;
    pct: number;
  };
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-900">{datum.pair}</p>
      <p className="text-slate-600">
        Vào <span className="font-mono">{datum.upstream}</span> · Qua{" "}
        <span className="font-mono">{datum.crossed}</span>
      </p>
      <p className="text-amber-700">Tỷ lệ {datum.pct}%</p>
    </div>
  );
}
