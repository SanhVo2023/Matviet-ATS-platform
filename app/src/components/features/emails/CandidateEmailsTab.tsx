import { Mail } from "lucide-react";
import { listCandidateEmails } from "@/server/email/repository";
import { listActiveTemplates } from "@/server/email/templates";
import { getComposerVarDefaults } from "@/server/email/composer-defaults";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/vi-format";
import { ComposeEmailButton } from "./ComposeEmailButton";
import { EmailStatusPill } from "./EmailStatusPill";

interface Props {
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  jobId: string;
  jobTitle: string | null;
  hrName: string;
  canCompose: boolean;
}

/**
 * Email history tab on candidate detail. Server component:
 * fetches templates + email_messages in parallel, renders a chronological list
 * with the composer button at the top.
 */
export async function CandidateEmailsTab({
  candidateId,
  candidateName,
  candidateEmail,
  jobId,
  jobTitle,
  hrName,
  canCompose,
}: Props) {
  const [emails, templates, autoVars] = await Promise.all([
    listCandidateEmails(candidateId),
    listActiveTemplates(),
    getComposerVarDefaults(candidateId, hrName),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">{t.emails.history.title}</p>
          <p className="text-xs text-slate-500">{t.emails.history.autoSendNotice}</p>
        </div>
        {canCompose && candidateEmail && (
          <ComposeEmailButton
            templates={templates}
            defaults={{
              candidateId,
              jobId,
              to: [candidateEmail],
              vars: {
                // Resolver first; the explicit values below stay as guaranteed fallbacks.
                ...autoVars,
                candidate_name: candidateName,
                job_title: jobTitle ?? "",
                hr_name: hrName,
                company_name: "Mắt Việt",
              },
              lockRecipient: true,
            }}
            size="sm"
            variant="navy"
          />
        )}
      </div>

      {emails.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <Mail className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm text-slate-500">{t.emails.history.empty}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {emails.map((e) => (
            <li key={e.id} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{e.subject}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {`${e.direction === "outbound" ? "→" : "←"} ${(e.to_emails ?? []).join(", ")}`}
                  </p>
                  {e.template_code && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {`${t.emails.col.template}: ${e.template_code}`}
                    </p>
                  )}
                  {e.error && (
                    <p className="mt-1 rounded bg-error-bg/60 px-2 py-1 text-xs text-error-fg">
                      {e.error}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  <EmailStatusPill status={e.status} />
                  <span className="text-slate-400">
                    {e.sent_at
                      ? `${t.emails.col.sent} ${formatDateTime(e.sent_at)}`
                      : `${t.emails.col.created} ${formatDateTime(e.created_at)}`}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
