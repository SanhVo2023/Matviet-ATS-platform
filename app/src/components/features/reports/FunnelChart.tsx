"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { FUNNEL_SUPER_COLOR } from "@/lib/charts/colors";
import { t } from "@/lib/i18n";
import type { FunnelSuperStageDatum } from "@/server/reports/types";

const SUPER_LABEL: Record<string, string> = {
  applied: "Mới",
  screening: "Sàng lọc",
  interview: "Phỏng vấn",
  approval: "Phê duyệt",
  offer: "Offer",
  hired: "Đã tuyển",
  rejected: "Từ chối",
};

const STAGE_LABEL: Record<string, string> = {
  new: "Mới",
  screening: "Đang sàng lọc",
  screened: "Đã sàng",
  interview_scheduled: "Đặt lịch PV",
  interviewed: "Đã PV",
  test_sent: "Gửi test",
  test_done: "Đã test",
  recommended: "Đề xuất",
  salary_deal: "Chốt lương",
  bod_review: "BOD duyệt",
  tap_doan_review: "Tập đoàn duyệt",
  offer_sent: "Đã gửi offer",
  offer_accepted: "Nhận offer",
  hired: "Đã tuyển",
  rejected: "Từ chối",
  withdrew: "Rút",
};

export function FunnelChart({ data }: { data: FunnelSuperStageDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Chưa có dữ liệu
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: SUPER_LABEL[d.super_stage] ?? d.super_stage,
    count: d.count,
    fill: FUNNEL_SUPER_COLOR[d.super_stage] ?? "#64748B",
    breakdown: d.stage_breakdown,
  }));

  return (
    <div className="h-72 w-full">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{t.reports.charts.funnel}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip content={<FunnelTooltip />} cursor={{ fill: "#F8FAFC" }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FunnelTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload as {
    name: string;
    count: number;
    breakdown: Array<{ stage: string; count: number }>;
  };
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-900">{datum.name}</p>
      <p className="text-slate-500">{datum.count} ứng viên</p>
      {datum.breakdown.length > 1 && (
        <ul className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5">
          {datum.breakdown.map((b) => (
            <li key={b.stage} className="flex justify-between gap-3 text-slate-600">
              <span>{STAGE_LABEL[b.stage] ?? b.stage}</span>
              <span className="font-mono">{b.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
