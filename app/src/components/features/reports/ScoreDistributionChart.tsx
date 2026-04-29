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
import { scoreBucketColor } from "@/lib/charts/colors";
import { t } from "@/lib/i18n";
import type { ScoreBucket } from "@/server/reports/types";

const BUCKETS: number[] = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

export function ScoreDistributionChart({ data }: { data: ScoreBucket[] }) {
  // Fill missing buckets with 0 so the histogram shape is uniform
  const byBucket = new Map(data.map((d) => [d.bucket_lower, d.count]));
  const chartData = BUCKETS.map((b) => ({
    bucket: `${b}-${b + 9}`,
    bucket_lower: b,
    count: byBucket.get(b) ?? 0,
  }));

  const total = chartData.reduce((a, b) => a + b.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Chưa có CV nào được chấm AI trong khoảng này
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">
        {t.reports.charts.scoreDistribution}{" "}
        <span className="text-xs text-slate-400">({total} ứng viên)</span>
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            formatter={(value: number) => [`${value} ứng viên`, "Số lượng"]}
            labelFormatter={(label: string) => `Điểm ${label}`}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map((d) => (
              <Cell key={d.bucket_lower} fill={scoreBucketColor(d.bucket_lower)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
