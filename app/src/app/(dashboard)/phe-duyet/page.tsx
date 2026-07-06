import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listPendingApprovalsForUser } from "@/server/approvals/repository";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/primitives/PageHeader";
import { t } from "@/lib/i18n";
import { STEP_LABEL_VI } from "@/server/approvals/presets";
import { formatRelative } from "@/lib/vi-format";
import { InlineDecide } from "./InlineDecide";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: t.nav.approvals };

export default async function ApprovalsInboxPage() {
  const profile = await requireRole(["admin", "hr", "hiring_manager", "bod", "tap_doan"]);
  const pending = await listPendingApprovalsForUser(profile.id, profile.role);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6 lg:p-8">
      <PageHeader
        icon={CheckCircle2}
        title={t.nav.approvals}
        subtitle="Các bước đang chờ bạn — duyệt/từ chối ngay tại đây, hoặc bấm tên để xem hồ sơ."
      />

      {pending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-success/50" aria-hidden />
            <p className="text-sm font-medium text-slate-700">{t.empty.approvals}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {pending.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <Link
                href={`/ung-vien/${row.candidate_id}`}
                className="min-w-0 flex-1 transition-opacity hover:opacity-75"
              >
                <p className="text-sm font-semibold text-slate-900">{row.candidate_name ?? "—"}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {row.job_title ?? "—"} ·{" "}
                  <span className="font-medium text-slate-700">{STEP_LABEL_VI[row.step_kind]}</span>{" "}
                  · {formatRelative(row.created_at)}
                </p>
              </Link>
              {/* One-tap decision in the row (ADR 0015) — detail stays 1 click away */}
              <InlineDecide approvalId={row.id} candidateName={row.candidate_name ?? "ứng viên"} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
