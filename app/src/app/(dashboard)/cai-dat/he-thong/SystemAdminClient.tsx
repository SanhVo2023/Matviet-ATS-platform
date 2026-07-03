"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Bot, Loader2, LogOut, PlayCircle, Database, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatRelative } from "@/lib/vi-format";
import { t } from "@/lib/i18n";
import type { Database as Db } from "@/types/db";
import {
  updateAiSettingsAction,
  drainQueuesNowAction,
  revokeUserSessionsAction,
  seedDemoAction,
  unseedDemoAction,
} from "./actions";

const FEATURE_LABEL: Record<string, string> = {
  scoring: "Chấm điểm CV",
  agent: "Trợ lý AI",
  email_draft: "Soạn email",
  jd_generate: "Viết mô tả tin",
  interview_questions: "Câu hỏi phỏng vấn",
  candidate_summary: "Tóm tắt ứng viên",
  general: "Khác",
};

function usd(n: number): string {
  return `$${n.toFixed(4)}`;
}

interface Props {
  ai: {
    currentModel: string;
    enabled: boolean;
    choices: Array<{ id: string; label: string; note: string }>;
    usageByFeature: Array<{
      feature: string;
      calls: number;
      tokensIn: number;
      tokensOut: number;
      cost: number;
    }>;
    last30d: { calls: number; tokens: number; cost: number };
    recentCalls: Array<{
      feature: string;
      model: string;
      tokens: number;
      cost: number;
      at: string;
    }>;
  };
  queues: {
    scoring: Array<{ status: string; n: number }>;
    email: Array<{ status: string; n: number }>;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: Db["public"]["Enums"]["user_role"];
    isActive: boolean;
    activeSessions: number;
    lastActive: string | null;
  }>;
}

export function SystemAdminClient({ ai, queues, users }: Props) {
  const [pending, start] = useTransition();
  const [model, setModel] = useState(ai.currentModel);
  const [enabled, setEnabled] = useState(ai.enabled);

  const act = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message);
      else toast.error(r.error);
    });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* ---------------- AI configuration ---------------- */}
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-accent-600" aria-hidden /> Cấu hình AI (Workers AI)
          </CardTitle>
          <CardDescription>
            Model áp dụng cho chấm điểm CV, trợ lý AI và mọi tính năng soạn thảo. Thay đổi có hiệu
            lực trong ~30 giây, không cần deploy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            {ai.choices.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 transition-colors ${
                  model === c.id
                    ? "border-accent-400 bg-accent-50 ring-1 ring-accent-400"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="ai-model"
                    checked={model === c.id}
                    onChange={() => setModel(c.id)}
                    className="accent-[#fbc312]"
                  />
                  <span className="text-sm font-semibold text-brand-900">{c.label}</span>
                </span>
                <span className="text-xs text-slate-500">{c.note}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 px-4 py-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 accent-[#fbc312]"
              />
              Bật tính năng AI (tắt = ngắt toàn bộ: chấm điểm, trợ lý, soạn thảo)
            </label>
            <Button
              onClick={() => act(() => updateAiSettingsAction({ model, enabled }))}
              disabled={pending}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Lưu cấu hình
            </Button>
          </div>

          {/* Usage stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">30 ngày — lượt gọi</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-900">
                {ai.last30d.calls.toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">30 ngày — token</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-900">
                {ai.last30d.tokens.toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">30 ngày — chi phí</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-900">
                {usd(ai.last30d.cost)}
              </p>
            </div>
          </div>

          {ai.usageByFeature.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Tính năng (7 ngày)</th>
                    <th className="px-2 py-2 text-right">Lượt</th>
                    <th className="px-2 py-2 text-right">Token vào/ra</th>
                    <th className="px-2 py-2 text-right">Chi phí</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ai.usageByFeature.map((u) => (
                    <tr key={u.feature}>
                      <td className="px-2 py-2 font-medium text-slate-700">
                        {FEATURE_LABEL[u.feature] ?? u.feature}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{u.calls}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {u.tokensIn.toLocaleString("vi-VN")} / {u.tokensOut.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{usd(u.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ai.recentCalls.length > 0 && (
            <details className="rounded-md border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                10 lượt gọi gần nhất
              </summary>
              <ul className="mt-2 space-y-1">
                {ai.recentCalls.map((c, i) => (
                  <li key={i} className="flex justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {FEATURE_LABEL[c.feature] ?? c.feature} · {c.model}
                    </span>
                    <span className="tabular-nums">
                      {c.tokens.toLocaleString("vi-VN")} tk · {usd(c.cost)} · {formatRelative(c.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Queues ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-accent-600" aria-hidden /> Hàng đợi nền
          </CardTitle>
          <CardDescription>Cron tự chạy mỗi 5 phút; nút dưới chạy ngay lập tức.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <QueueBox title="Chấm điểm CV" rows={queues.scoring} />
            <QueueBox title="Email đi" rows={queues.email} />
          </div>
          <Button variant="navy" onClick={() => act(drainQueuesNowAction)} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Chạy hàng đợi ngay
          </Button>
        </CardContent>
      </Card>

      {/* ---------------- Demo data ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4 text-accent-600" aria-hidden /> Dữ liệu demo
          </CardTitle>
          <CardDescription>
            Bộ dữ liệu thử nghiệm đầy đủ (tài khoản, ứng viên, phỏng vấn, duyệt…).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => act(seedDemoAction)} disabled={pending}>
            Tạo dữ liệu demo
          </Button>
          <Button
            variant="outline"
            className="text-error-fg hover:bg-error-bg/40"
            onClick={() => act(unseedDemoAction)}
            disabled={pending}
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Xoá ứng viên demo (báo cáo)
          </Button>
        </CardContent>
      </Card>

      {/* ---------------- Users & sessions ---------------- */}
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-4 w-4 text-accent-600" aria-hidden /> Người dùng & phiên đăng nhập
          </CardTitle>
          <CardDescription>
            Phiên hết hạn sau 8 giờ không hoạt động. Thu hồi = đăng xuất khỏi mọi thiết bị.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Thành viên</th>
                  <th className="px-2 py-2">Vai trò</th>
                  <th className="px-2 py-2">Trạng thái</th>
                  <th className="px-2 py-2 text-right">Phiên đang mở</th>
                  <th className="px-2 py-2">Hoạt động gần nhất</th>
                  <th className="px-2 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-2 py-2">
                      <p className="font-medium text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-2 py-2 text-slate-600">{t.userRole[u.role]}</td>
                    <td className="px-2 py-2">
                      <Badge tone={u.isActive ? "success" : "neutral"}>
                        {u.isActive ? "Hoạt động" : "Vô hiệu"}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{u.activeSessions}</td>
                    <td className="px-2 py-2 text-xs text-slate-500">
                      {u.lastActive ? formatDateTime(u.lastActive) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending || u.activeSessions === 0}
                        onClick={() => act(() => revokeUserSessionsAction(u.id))}
                      >
                        Thu hồi phiên
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QueueBox({ title, rows }: { title: string; rows: Array<{ status: string; n: number }> }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Trống</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {rows.map((r) => (
            <li key={r.status} className="flex justify-between text-sm">
              <span className="text-slate-600">{r.status}</span>
              <span className="font-semibold tabular-nums text-brand-900">{r.n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
