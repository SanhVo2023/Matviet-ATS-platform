import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/primitives/StatusPill";
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { proposalStats } from "@/server/agent-flows/repository";
import { formatPercent, formatRelative } from "@/lib/vi-format";

const KIND_LABEL: Record<string, string> = {
  interview_invite: "Mời phỏng vấn",
  start_approval: "Trình duyệt",
  compose_offer: "Soạn offer",
  nudge_stale: "Nhắc việc",
  job_from_intent: "Tạo vị trí",
  onboarding_packet: "Gói hội nhập",
  probation_review: "Hết thử việc",
  contract_renewal: "Gia hạn hợp đồng",
  leave_request: "Nghỉ phép",
  confirm_hire: "Xác nhận tuyển",
  retry_scoring: "Chấm lại AI",
  orphan_approval: "Duyệt treo",
};

/**
 * Agent run log (audit P1) — the admin's one glance at whether the assistant
 * is useful: how many cards it made, how many humans accepted, what failed.
 * Server component; renders on /cai-dat/he-thong.
 */
export async function AgentHealthCard() {
  const s = await proposalStats(30);
  const stat = (label: string, value: string | number, hint?: string) => (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-2xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-bold tabular-nums text-brand-900">{value}</p>
      {hint ? <p className="text-2xs text-slate-500">{hint}</p> : null}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base text-brand-900">
          <Activity className="h-4 w-4 text-accent-600" aria-hidden />
          Trợ lý AI — {s.window_days} ngày qua
        </CardTitle>
        {s.oldest_open_at ? (
          <span className="text-xs text-slate-500">
            Thẻ cũ nhất đang chờ: {formatRelative(s.oldest_open_at)}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {stat("Đề xuất", s.total)}
          {stat("Đang chờ", s.open)}
          {stat("Đã duyệt", s.executed)}
          {stat("Bỏ qua", s.dismissed)}
          {stat(
            "Tỷ lệ chấp nhận",
            s.acceptance_rate == null ? "—" : formatPercent(s.acceptance_rate * 100),
            "duyệt / (duyệt + bỏ qua)",
          )}
        </div>

        {s.by_kind.length > 0 ? (
          <TableFrame>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại đề xuất</TableHead>
                  <TableHead className="text-right">Đề xuất</TableHead>
                  <TableHead className="text-right">Duyệt</TableHead>
                  <TableHead className="text-right">Bỏ qua</TableHead>
                  <TableHead className="text-right">Lỗi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.by_kind.map((k) => (
                  <TableRow key={k.kind}>
                    <TableCell className="font-medium text-brand-900">
                      {KIND_LABEL[k.kind] ?? k.kind}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{k.proposed}</TableCell>
                    <TableCell className="text-right tabular-nums text-success-fg">
                      {k.executed}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500">
                      {k.dismissed}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {k.failed > 0 ? (
                        <StatusPill tone="error" size="sm">
                          {k.failed}
                        </StatusPill>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        ) : (
          <p className="text-sm text-slate-500">
            Chưa có đề xuất nào trong {s.window_days} ngày qua.
          </p>
        )}

        {s.recent_failures.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Lỗi gần đây
            </p>
            <ul className="space-y-1.5">
              {s.recent_failures.map((f) => (
                <li key={f.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="error" size="sm">
                      {KIND_LABEL[f.kind] ?? f.kind}
                    </StatusPill>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{f.summary}</span>
                    {f.decided_at ? (
                      <span className="text-2xs text-slate-400">
                        {formatRelative(f.decided_at)}
                      </span>
                    ) : null}
                  </div>
                  {f.error ? <p className="mt-1 text-xs text-error-fg">{f.error}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
