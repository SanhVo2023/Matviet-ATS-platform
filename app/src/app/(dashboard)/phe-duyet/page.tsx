import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listPendingApprovalsForUser } from "@/server/approvals/repository";

import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { STEP_LABEL_VI } from "@/server/approvals/presets";
import { formatRelative } from "@/lib/vi-format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: t.nav.approvals };

export default async function ApprovalsInboxPage() {
  const profile = await requireRole(["admin", "hr", "hiring_manager", "bod", "tap_doan"]);
  const pending = await listPendingApprovalsForUser(profile.id, profile.role);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6 lg:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">{t.nav.approvals}</h1>
        <p className="text-sm text-slate-500">
          CÃ¡c bÆ°á»›c duyá»‡t Ä‘ang chá» báº¡n xá»­ lÃ½. Báº¥m vÃ o á»©ng viÃªn Ä‘á»ƒ má»Ÿ chi
          tiáº¿t vÃ  quyáº¿t Ä‘á»‹nh.
        </p>
      </header>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-300" aria-hidden />
            <p className="text-sm font-medium text-slate-700">{t.empty.approvals}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {pending.map((row) => (
            <li key={row.id}>
              <Link
                href={`/ung-vien/${row.candidate_id}`}
                className="flex items-start justify-between gap-4 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {row.candidate_name ?? "â€”"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {row.job_title ?? "â€”"} Â·{" "}
                    <span className="font-medium text-slate-700">
                      {STEP_LABEL_VI[row.step_kind]}
                    </span>
                  </p>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
                  {formatRelative(row.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
