import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listEmailsForQueuePage } from "@/server/email/repository";
import { listActiveTemplates } from "@/server/email/templates";
import { ComposeEmailButton } from "@/components/features/emails/ComposeEmailButton";
import { EmailStatusPill } from "@/components/features/emails/EmailStatusPill";
import { EmailQueueFilter } from "@/components/features/emails/EmailQueueFilter";
import { EmailQueueRowActions } from "@/components/features/emails/EmailQueueRowActions";
import { PageHeader } from "@/components/primitives/PageHeader";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/vi-format";
import type { Database } from "@/types/db";

type EmailStatus = Database["public"]["Enums"]["email_status"];

export const metadata: Metadata = { title: `${t.emails.queue.title} · ${t.app.name}` };
export const dynamic = "force-dynamic";

const KNOWN_STATUSES = new Set<EmailStatus>([
  "queued",
  "pending_approval",
  "sent",
  "delivered",
  "failed",
  "received",
]);

export default async function EmailQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["admin", "hr"]);
  const sp = await searchParams;
  const status: EmailStatus | null =
    sp.status && KNOWN_STATUSES.has(sp.status as EmailStatus) ? (sp.status as EmailStatus) : null;

  const [rows, templates] = await Promise.all([
    listEmailsForQueuePage({ status }),
    listActiveTemplates(),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <PageHeader
        icon={Mail}
        title={t.emails.queue.title}
        subtitle={t.emails.queue.subtitle}
        action={<ComposeEmailButton templates={templates} />}
        className="mb-4"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <EmailQueueFilter />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-sm text-slate-500">
          {t.emails.queue.empty}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t.emails.col.candidate}</th>
                <th className="px-4 py-3">{t.emails.col.subject}</th>
                <th className="px-4 py-3">{t.emails.col.template}</th>
                <th className="px-4 py-3">{t.emails.col.status}</th>
                <th className="px-4 py-3">{t.emails.col.retries}</th>
                <th className="px-4 py-3">{t.emails.col.created}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 align-top">
                    {r.candidate ? (
                      <Link
                        href={`/ung-vien/${r.candidate.id}`}
                        className="font-medium text-primary-600 hover:underline"
                      >
                        {r.candidate.full_name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                    <p className="mt-0.5 text-xs text-slate-500">
                      {(r.to_emails ?? []).join(", ")}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="line-clamp-2 max-w-md text-slate-900">{r.subject}</p>
                    {r.error && (
                      <p className="mt-1 line-clamp-2 max-w-md text-xs text-error-fg">{r.error}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    {r.template_code ?? "—"}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <EmailStatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">{r.retry_count}</td>
                  <td className="px-4 py-3 align-top text-xs text-slate-500">
                    {r.sent_at ? formatDateTime(r.sent_at) : formatDateTime(r.created_at)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <EmailQueueRowActions id={r.id} status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
