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
import { PageContainer } from "@/components/primitives/PageContainer";
import {
  TableFrame,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
    <PageContainer size="wide">
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
        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.emails.col.candidate}</TableHead>
                <TableHead>{t.emails.col.subject}</TableHead>
                <TableHead>{t.emails.col.template}</TableHead>
                <TableHead>{t.emails.col.status}</TableHead>
                <TableHead>{t.emails.col.retries}</TableHead>
                <TableHead>{t.emails.col.created}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="hover:bg-slate-50/60">
                  <TableCell className="align-top">
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
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="line-clamp-2 max-w-md text-slate-900">{r.subject}</p>
                    {r.error && (
                      <p className="mt-1 line-clamp-2 max-w-md text-xs text-error-fg">{r.error}</p>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-xs text-slate-600">
                    {r.template_code
                      ? (t.emails.templateLabel[
                          r.template_code as keyof typeof t.emails.templateLabel
                        ] ?? r.template_code)
                      : "—"}
                  </TableCell>
                  <TableCell className="align-top">
                    <EmailStatusPill status={r.status} />
                  </TableCell>
                  <TableCell className="align-top text-xs text-slate-600">
                    {r.retry_count}
                  </TableCell>
                  <TableCell className="align-top text-xs text-slate-500">
                    {r.sent_at ? formatDateTime(r.sent_at) : formatDateTime(r.created_at)}
                  </TableCell>
                  <TableCell className="align-top">
                    <EmailQueueRowActions id={r.id} status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    </PageContainer>
  );
}
