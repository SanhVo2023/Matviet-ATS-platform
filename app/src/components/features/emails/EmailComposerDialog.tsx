"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SlideOver } from "@/components/primitives/SlideOver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { composeEmailAction, draftEmailAction } from "@/app/(dashboard)/email/actions";
import { findMissingPlaceholders, renderTemplate } from "@/server/email/template-render";

export interface ComposerTemplateInfo {
  code: string;
  name_vi: string;
  subject_vi: string;
  body_html: string;
  variables: string[];
  requires_approval: boolean;
}

export interface ComposerDefaults {
  candidateId?: string;
  jobId?: string;
  interviewId?: string;
  to?: string[];
  cc?: string[];
  /** Pre-fill values for known variable names (candidate_name, job_title, hr_name, etc.) */
  vars?: Record<string, string>;
  /** When set, lock the recipient field — used from candidate detail. */
  lockRecipient?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ComposerTemplateInfo[];
  defaults?: ComposerDefaults;
}

/**
 * Email composer. Opens as a slide-over from the candidate detail "Soạn email" button
 * or from the queue page header. Supports template-based + ad-hoc sends.
 */
export function EmailComposerDialog({ open, onOpenChange, templates, defaults }: Props) {
  const router = useRouter();
  const [templateCode, setTemplateCode] = React.useState<string>("");
  const [vars, setVars] = React.useState<Record<string, string>>(defaults?.vars ?? {});
  const [to, setTo] = React.useState<string>(defaults?.to?.join(", ") ?? "");
  const [cc, setCc] = React.useState<string>(defaults?.cc?.join(", ") ?? "");
  const [subject, setSubject] = React.useState<string>("");
  const [body, setBody] = React.useState<string>("");
  const [forceImmediate, setForceImmediate] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [aiPurpose, setAiPurpose] = React.useState<string>("");
  const [drafting, setDrafting] = React.useState<boolean>(false);
  // Auto-resolved vars stay collapsed until HR clicks "Sửa" (ADR 0015).
  const [editVars, setEditVars] = React.useState<Set<string>>(new Set());

  // Reset when opening fresh
  React.useEffect(() => {
    if (open) {
      setTemplateCode("");
      setVars(defaults?.vars ?? {});
      setTo(defaults?.to?.join(", ") ?? "");
      setCc(defaults?.cc?.join(", ") ?? "");
      setSubject("");
      setBody("");
      setForceImmediate(false);
      setSubmitting(false);
      setAiPurpose("");
      setDrafting(false);
    }
  }, [open, defaults]);

  const handleAiDraft = async () => {
    setDrafting(true);
    const res = await draftEmailAction({
      purpose: aiPurpose,
      candidate_name: vars.candidate_name || defaults?.vars?.candidate_name || undefined,
      job_title: vars.job_title || defaults?.vars?.job_title || undefined,
    });
    setDrafting(false);
    if (!res.ok || !res.data) {
      toast.error(res.ok ? "Không soạn được email bằng AI" : res.error);
      return;
    }
    // AI drafts are ad-hoc content: drop any selected template so the send
    // path uses the subject + body the user reviews on screen.
    setTemplateCode("");
    setSubject(res.data.subject);
    setBody(res.data.body_html);
    toast.success("AI đã soạn nháp — hãy đọc lại và chỉnh sửa trước khi gửi.");
  };

  const selectedTemplate = templates.find((tpl) => tpl.code === templateCode) ?? null;

  // When template changes, snap subject + body to the template strings (raw, with {{vars}})
  // so the preview can substitute. Vars merge with whatever defaults the caller provided.
  React.useEffect(() => {
    if (selectedTemplate) {
      setSubject(selectedTemplate.subject_vi);
      setBody(selectedTemplate.body_html);
      setVars((prev) => {
        const next: Record<string, string> = { ...prev };
        for (const v of selectedTemplate.variables) if (next[v] === undefined) next[v] = "";
        return next;
      });
    }
  }, [selectedTemplate]);

  const renderedSubject = renderTemplate(subject, vars);
  const renderedBody = renderTemplate(body, vars);
  // offer_link is minted server-side at queue time — never "missing"
  const missing = findMissingPlaceholders(`${renderedSubject}\n${renderedBody}`).filter(
    (m) => m !== "offer_link",
  );
  const canSubmit =
    !submitting && to.trim().length > 0 && subject.trim().length > 0 && body.trim().length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    const toList = to
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const ccList = cc
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await composeEmailAction({
      template_code: selectedTemplate?.code ?? null,
      candidate_id: defaults?.candidateId ?? null,
      job_id: defaults?.jobId ?? null,
      interview_id: defaults?.interviewId ?? null,
      to: toList,
      cc: ccList.length ? ccList : undefined,
      subject: selectedTemplate ? undefined : subject,
      body_html: selectedTemplate ? undefined : body,
      vars,
      force_immediate: forceImmediate || !selectedTemplate?.requires_approval,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      res.data?.status === "pending_approval"
        ? t.emails.compose.successPendingApproval
        : t.emails.compose.successQueued,
    );
    onOpenChange(false);
    router.refresh();
  };

  return (
    <SlideOver open={open} onOpenChange={onOpenChange} title={t.emails.compose.title} width="xl">
      <SlideOver.Body>
        <div className="space-y-5">
          {/* Template picker */}
          <div className="space-y-1.5">
            <Label htmlFor="template">{t.emails.compose.template}</Label>
            <select
              id="template"
              value={templateCode}
              onChange={(e) => setTemplateCode(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              disabled={submitting}
            >
              <option value="">{t.emails.compose.templateNone}</option>
              {templates.map((tpl) => (
                <option key={tpl.code} value={tpl.code}>
                  {tpl.name_vi} {tpl.requires_approval ? "(cần phê duyệt)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient + CC */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="to">{t.emails.compose.to}</Label>
              <Input
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={submitting || !!defaults?.lockRecipient}
                placeholder="ung-vien@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc">{t.emails.compose.cc}</Label>
              <Input
                id="cc"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                disabled={submitting}
                placeholder="hr-team@matkinh.com.vn"
              />
            </div>
          </div>

          {/* AI draft helper — fills subject + body for review, never sends */}
          <div className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-3">
            <Label htmlFor="ai-purpose">Soạn nháp bằng AI</Label>
            <div className="flex gap-2">
              <Input
                id="ai-purpose"
                value={aiPurpose}
                onChange={(e) => setAiPurpose(e.target.value)}
                disabled={submitting || drafting}
                placeholder="Mục đích, vd: mời phỏng vấn vòng 2 thứ Năm 14h"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 shrink-0"
                onClick={handleAiDraft}
                disabled={submitting || drafting || aiPurpose.trim().length < 3}
              >
                {drafting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden />
                )}
                {drafting ? "Đang soạn..." : "Soạn bằng AI"}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              AI điền tiêu đề + nội dung để bạn duyệt lại — không tự gửi.
            </p>
          </div>

          {/* Variable inputs (only for templates) */}
          {selectedTemplate && selectedTemplate.variables.length > 0 && (
            <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700">{t.emails.compose.varsHeader}</p>
              {(() => {
                // ADR 0015: vars the system resolved itself collapse into a
                // summary line — HR only types what the app can't know.
                const prefilled = selectedTemplate.variables.filter(
                  (n) =>
                    n !== "offer_link" && !editVars.has(n) && (defaults?.vars?.[n] ?? "") !== "",
                );
                const manual = selectedTemplate.variables.filter(
                  (n) => n !== "offer_link" && !prefilled.includes(n),
                );
                return (
                  <>
                    {prefilled.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-2 text-xs text-emerald-900">
                        <span className="font-medium">✓ Đã tự điền:</span>
                        {prefilled.map((n) => (
                          <span key={n} className="rounded bg-white/70 px-1.5 py-0.5">
                            {vars[n] || defaults?.vars?.[n]}
                          </span>
                        ))}
                        <button
                          type="button"
                          className="ml-auto font-medium text-primary-700 hover:underline"
                          onClick={() => setEditVars(new Set(selectedTemplate.variables))}
                        >
                          Sửa
                        </button>
                      </div>
                    )}
                    {manual.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {manual.map((name) => (
                          <div key={name} className="space-y-1">
                            <Label
                              htmlFor={`var-${name}`}
                              className="font-mono text-xs text-slate-600"
                            >
                              {`{{${name}}}`}
                            </Label>
                            <Input
                              id={`var-${name}`}
                              value={vars[name] ?? ""}
                              onChange={(e) =>
                                setVars((prev) => ({ ...prev, [name]: e.target.value }))
                              }
                              disabled={submitting}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedTemplate.variables.includes("offer_link") && (
                      <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">
                        {"{{offer_link}}"} — tạo tự động khi gửi, liên kết nhận việc có hiệu lực 7
                        ngày
                      </p>
                    )}
                  </>
                );
              })()}
              {missing.length > 0 && (
                <p className="text-xs text-amber-700">
                  {t.emails.compose.missingVars
                    .replace("{{n}}", String(missing.length))
                    .replace("{{names}}", missing.map((m) => `{{${m}}}`).join(", "))}
                </p>
              )}
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="subject">{t.emails.compose.subject}</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submitting}
            />
            {selectedTemplate && (
              <p className="text-xs text-slate-500">
                {t.emails.compose.preview}: {renderedSubject}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="body">{t.emails.compose.body}</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={submitting}
              rows={10}
              className="font-mono text-xs"
            />
          </div>

          {/* Live preview */}
          <div className="space-y-1.5">
            <Label>{t.emails.compose.preview}</Label>
            <div
              className="max-h-[300px] overflow-auto rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-800"
              dangerouslySetInnerHTML={{
                __html:
                  renderedBody || `<p class="text-slate-400">${t.emails.compose.previewNone}</p>`,
              }}
            />
          </div>

          {/* Approval toggle */}
          {selectedTemplate?.requires_approval && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={forceImmediate}
                onChange={(e) => setForceImmediate(e.target.checked)}
                disabled={submitting}
                className="mt-0.5"
              />
              <span>
                <span className="text-slate-900">{t.emails.compose.forceImmediate}</span>
                <span className="block text-xs text-slate-500">
                  {t.emails.compose.requiresApproval}
                </span>
              </span>
            </label>
          )}
        </div>
      </SlideOver.Body>
      <SlideOver.Footer>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          {t.action.cancel}
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} className={cn("gap-2")}>
          <Send className="h-4 w-4" aria-hidden />
          {submitting ? t.emails.compose.submitting : t.emails.compose.submit}
        </Button>
      </SlideOver.Footer>
    </SlideOver>
  );
}
