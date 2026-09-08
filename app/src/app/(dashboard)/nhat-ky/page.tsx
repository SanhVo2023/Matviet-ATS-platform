import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listAuditLog } from "@/server/audit/repository";
import { lookupProfileNames } from "@/server/candidates/repository";
import { PageHeader } from "@/components/primitives/PageHeader";
import { PageContainer } from "@/components/primitives/PageContainer";
import { EmptyState } from "@/components/primitives/EmptyState";
import {
  TableFrame,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/vi-format";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t.nav.audit };

const ACTION_LABEL: Record<string, string> = {
  agent_stage_move: "Trợ lý chuyển giai đoạn",
  admin_set_password: "Đặt lại mật khẩu",
  admin_update_user: "Cập nhật người dùng",
  admin_activate_user: "Kích hoạt người dùng",
  admin_deactivate_user: "Vô hiệu người dùng",
  admin_send_reset: "Gửi email đặt lại mật khẩu",
};

function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

/** Admin audit trail (renovation R3): agent executions + user-admin actions,
 * both already written to audit_log — this is the read surface they lacked. */
export default async function AuditLogPage() {
  await requireRole(["admin"]);
  const rows = await listAuditLog({ limit: 100 });
  const actorNames = await lookupProfileNames(
    rows.map((r) => r.actor_user_id).filter((x): x is string => !!x),
  );

  return (
    <PageContainer size="wide" className="space-y-4">
      <PageHeader
        icon={ScrollText}
        title={t.nav.audit}
        subtitle="100 hoạt động gần nhất — thao tác của trợ lý AI và quản trị người dùng."
      />

      {rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="Chưa có hoạt động nào được ghi nhận" />
      ) : (
        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead>Đối tượng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const via = (r.meta as { via?: string } | null)?.via;
                const actor =
                  via === "agent" || via === "agent_proposal"
                    ? "Trợ lý AI"
                    : r.actor_user_id
                      ? (actorNames[r.actor_user_id] ?? "—")
                      : "Hệ thống";
                return (
                  <TableRow key={r.id} className="text-slate-700">
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {formatDateTime(r.at)}
                    </TableCell>
                    <TableCell>{actionLabel(r.action)}</TableCell>
                    <TableCell>{actor}</TableCell>
                    <TableCell>
                      {r.entity === "candidates" && r.entity_id ? (
                        <Link
                          href={`/ung-vien/${r.entity_id}`}
                          className="text-primary-600 hover:underline"
                        >
                          ứng viên
                        </Link>
                      ) : (
                        <span className="text-slate-400">{r.entity}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    </PageContainer>
  );
}
