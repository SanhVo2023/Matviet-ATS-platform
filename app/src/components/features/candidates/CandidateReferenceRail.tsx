"use client";

import * as React from "react";
import { Calendar, Download, FileText, Mail, MapPin, Phone, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlideOver } from "@/components/primitives/SlideOver";
import { EmailStatusPill } from "@/components/features/emails/EmailStatusPill";
import { formatDateTime, formatRelative } from "@/lib/vi-format";
import type { Database } from "@/types/db";

type EmailStatus = Database["public"]["Enums"]["email_status"];

export interface RailEmailRow {
  id: string;
  subject: string;
  direction: string;
  to_emails: string[];
  template_code: string | null;
  error: string | null;
  status: EmailStatus;
  sent_at: string | null;
  created_at: string;
}

interface Props {
  contact: {
    email: string | null;
    phone: string | null;
    location: string | null;
    createdAt: string;
  };
  cv: { signedUrl: string | null; mime: string; originalName: string } | null;
  /** "Đổi CV" button etc. — server-prepared, admin/hr only. */
  cvActionSlot?: React.ReactNode;
  notes: string | null;
  emails: RailEmailRow[];
  /** Server-prepared ComposeEmailButton (needs templates + var defaults). */
  composeSlot?: React.ReactNode;
}

/**
 * Reference material (ADR 0019): contact, CV, notes, emails — everything
 * that is NOT the process lives here as compact cards; heavyweight content
 * (PDF, email history) opens in slide-overs so the journey keeps the stage.
 */
export function CandidateReferenceRail({
  contact,
  cv,
  cvActionSlot,
  notes,
  emails,
  composeSlot,
}: Props) {
  const [cvOpen, setCvOpen] = React.useState(false);
  const [emailsOpen, setEmailsOpen] = React.useState(false);
  const lastEmail = emails[0] ?? null;

  // Chromium hides the page-thumbnail sidebar with navpanes=0; Firefox's
  // pdf.js honours pagemode=none — Sanh: "just the PDF, no sidebar".
  const pdfSrc = cv?.signedUrl ? `${cv.signedUrl}#navpanes=0&pagemode=none` : null;

  return (
    <div className="space-y-4">
      {/* Contact */}
      <RailCard title="Liên hệ">
        <ul className="space-y-1.5 text-sm text-slate-700">
          <ContactLine icon={Mail} value={contact.email} href={`mailto:${contact.email}`} />
          <ContactLine icon={Phone} value={contact.phone} href={`tel:${contact.phone}`} />
          <ContactLine icon={MapPin} value={contact.location} />
          <ContactLine icon={Calendar} value={`Nộp hồ sơ ${formatRelative(contact.createdAt)}`} />
        </ul>
      </RailCard>

      {/* CV */}
      <RailCard title="CV gốc">
        {cv ? (
          <>
            <p className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
              <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="truncate">{cv.originalName}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {cv.mime === "application/pdf" && cv.signedUrl ? (
                <Button size="sm" variant="navy" onClick={() => setCvOpen(true)}>
                  Xem CV
                </Button>
              ) : null}
              {cv.signedUrl ? (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={cv.signedUrl}
                    download={cv.originalName}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="h-4 w-4" aria-hidden /> Tải về
                  </a>
                </Button>
              ) : null}
              {cvActionSlot}
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-500">
            <p>Chưa có CV đính kèm.</p>
            {cvActionSlot ? <div className="mt-2">{cvActionSlot}</div> : null}
          </div>
        )}
      </RailCard>

      {/* Notes */}
      {notes ? (
        <RailCard title="Ghi chú nội bộ" icon={StickyNote}>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{notes}</p>
        </RailCard>
      ) : null}

      {/* Emails */}
      <RailCard title={`Email (${emails.length})`}>
        {lastEmail ? (
          <div className="text-sm">
            <p className="truncate font-medium text-slate-800">{lastEmail.subject}</p>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <EmailStatusPill status={lastEmail.status} />
              {formatRelative(lastEmail.sent_at ?? lastEmail.created_at)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Chưa có email nào.</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {emails.length > 0 ? (
            <Button size="sm" variant="outline" onClick={() => setEmailsOpen(true)}>
              Xem tất cả
            </Button>
          ) : null}
          {composeSlot}
        </div>
      </RailCard>

      {/* CV slide-over — just the PDF, full height */}
      {cv && pdfSrc ? (
        <SlideOver
          open={cvOpen}
          onOpenChange={setCvOpen}
          title="CV gốc"
          description={cv.originalName}
          width="xl"
        >
          <SlideOver.Body className="p-0">
            <iframe src={pdfSrc} className="h-full w-full" title={`CV: ${cv.originalName}`} />
          </SlideOver.Body>
        </SlideOver>
      ) : null}

      {/* Emails slide-over — history list (compose stays on the rail card) */}
      <SlideOver
        open={emailsOpen}
        onOpenChange={setEmailsOpen}
        title="Email đã gửi"
        description="Toàn bộ trao đổi với ứng viên"
        width="lg"
      >
        <SlideOver.Body>
          {emails.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có email nào.</p>
          ) : (
            <ul className="space-y-2">
              {emails.map((e) => (
                <li key={e.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{e.subject}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {`${e.direction === "outbound" ? "→" : "←"} ${e.to_emails.join(", ")}`}
                      </p>
                      {e.template_code ? (
                        <p className="mt-0.5 text-xs text-slate-400">Mẫu: {e.template_code}</p>
                      ) : null}
                      {e.error ? (
                        <p className="mt-1 rounded bg-error-bg/60 px-2 py-1 text-xs text-error-fg">
                          {e.error}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <EmailStatusPill status={e.status} />
                      <span className="text-slate-400">
                        {formatDateTime(e.sent_at ?? e.created_at)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SlideOver.Body>
      </SlideOver>
    </div>
  );
}

function RailCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
        {title}
      </h2>
      {children}
    </section>
  );
}

function ContactLine({
  icon: Icon,
  value,
  href,
}: {
  icon: typeof Mail;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value) return null;
  return (
    <li className="flex min-w-0 items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      {href ? (
        <a href={href} className="truncate hover:text-primary-600 hover:underline">
          {value}
        </a>
      ) : (
        <span className="truncate">{value}</span>
      )}
    </li>
  );
}
