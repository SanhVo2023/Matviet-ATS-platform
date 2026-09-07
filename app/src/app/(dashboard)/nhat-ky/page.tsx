import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listAuditLog } from "@/server/audit/repository";
import { lookupProfileNames } from "@/server/candidates/repository";
import { PageHeader } from "@/components/primitives/PageHeader";
import { EmptyState } from "@/components/primitives/EmptyState";
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
    <div className="mx-auto max-w-5xl space-y-4 p-6 lg:p-8">
      <PageHeader
        icon={ScrollText}
        title={t.nav.audit}
        subtitle="100 hoạt động gần nhất — thao tác của trợ lý AI và quản trị người dùng."
      />

      {rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="Chưa có hoạt động nào được ghi nhận" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-semibold">Thời gian</th>
                <th className="px-4 py-2.5 font-semibold">Hành động</th>
                <th className="px-4 py-2.5 font-semibold">Người thực hiện</th>
                <th className="px-4 py-2.5 font-semibold">Đối tượng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const via = (r.meta as { via?: string } | null)?.via;
                const actor =
                  via === "agent" || via === "agent_proposal"
                    ? "Trợ lý AI"
                    : r.actor_user_id
                      ? (actorNames[r.actor_user_id] ?? "—")
                      : "Hệ thống";
                return (
                  <tr key={r.id} className="text-slate-700">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">
                      {formatDateTime(r.at)}
                    </td>
                    <td className="px-4 py-2.5">{actionLabel(r.action)}</td>
                    <td className="px-4 py-2.5">{actor}</td>
                    <td className="px-4 py-2.5">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
