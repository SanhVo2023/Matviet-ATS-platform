"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  Mail,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatDateTime, formatRelative, formatVND } from "@/lib/vi-format";
import { executeProposalAction, dismissProposalAction } from "@/app/(dashboard)/proposal-actions";
import type { ProposalKind } from "@/db/schema";

/**
 * "Hôm nay" proposal feed (ADR 0020) — agent-prepared actions, one tap to
 * approve. Every card: what + why + [Duyệt] [Bỏ qua]. The wiring is hidden;
 * the result is shown.
 */

export interface FeedProposal {
  id: string;
  kind: string;
  summary: string;
  reasoning: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  candidate_id: string | null;
  candidate_name: string | null;
  job_title: string | null;
}

// Keyed to ProposalKind so adding a kind server-side is a compile error
// here instead of a silently wrong card.
const KIND_META: Record<
  ProposalKind,
  { icon: React.ElementType; tint: string; approveLabel: string }
> = {
  interview_invite: {
    icon: CalendarPlus,
    tint: "bg-indigo-50 text-indigo-600",
    approveLabel: "Đặt lịch & gửi thư mời",
  },
  start_approval: {
    icon: CheckCircle2,
    tint: "bg-amber-50 text-amber-600",
    approveLabel: "Trình duyệt",
  },
  compose_offer: { icon: Mail, tint: "bg-indigo-50 text-indigo-600", approveLabel: "Soạn thư" },
  nudge_stale: { icon: Clock3, tint: "bg-rose-50 text-rose-600", approveLabel: "Gửi nhắc" },
  job_from_intent: {
    icon: Sparkles,
    tint: "bg-accent-50 text-accent-600",
    approveLabel: "Đăng tuyển",
  },
};

export function ProposalFeed({ proposals }: { proposals: FeedProposal[] }) {
  if (proposals.length === 0) return null;
  return (
    <section aria-label="Trợ lý đề xuất" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-100">
          <Sparkles className="h-3.5 w-3.5 text-accent-600" aria-hidden />
        </span>
        <h2 className="text-base font-bold text-brand-900">Trợ lý đề xuất</h2>
        <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-accent-700">
          {proposals.length}
        </span>
      </div>
      <div className="space-y-2">
        {proposals.map((p) => (
          <ProposalCard key={p.id} proposal={p} />
        ))}
      </div>
    </section>
  );
}

function ProposalCard({ proposal: p }: { proposal: FeedProposal }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  // Default to the first slot that is still in the future.
  const [slotIndex, setSlotIndex] = React.useState(() => {
    const slots = (p.payload.slots as SlotShape[] | undefined) ?? [];
    const i = slots.findIndex((s) => Date.parse(s.start) > Date.now());
    return i >= 0 ? i : 0;
  });
  const [busy, setBusy] = React.useState<"execute" | "dismiss" | null>(null);
  const meta = KIND_META[p.kind as ProposalKind] ?? KIND_META.nudge_stale;
  const Icon = meta.icon;

  // compose_offer needs human salary judgment → primary action is a LINK to
  // the candidate page (rung 3 has the composer); the card closes itself
  // when the offer email gets queued from anywhere.
  const isComposerHandoff = p.kind === "compose_offer" && p.candidate_id;

  const run = async (action: "execute" | "dismiss") => {
    setBusy(action);
    const res =
      action === "execute"
        ? await executeProposalAction(p.id, { slotIndex })
        : await dismissProposalAction(p.id);
    setBusy(null);
    if (res.ok) {
      if (action === "execute") {
        const msg = (res.data as { message?: string } | undefined)?.message;
        toast.success(msg || "Đã thực hiện");
      }
      router.refresh();
    } else {
      toast.error(res.error);
      router.refresh();
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            meta.tint,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{p.summary}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            {p.job_title ? <span>{p.job_title}</span> : null}
            {p.candidate_id ? (
              <>
                <span aria-hidden>·</span>
                <Link
                  href={`/ung-vien/${p.candidate_id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  Mở hồ sơ
                </Link>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <time dateTime={p.created_at}>{formatRelative(p.created_at)}</time>
          </p>

          {/* Kind-specific always-visible essentials */}
          {p.kind === "interview_invite" ? (
            <SlotPicker payload={p.payload} value={slotIndex} onChange={setSlotIndex} />
          ) : null}

          {open ? <ProposalDetail proposal={p} /> : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          aria-expanded={open}
          aria-label="Vì sao?"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy !== null}
          onClick={() => run("dismiss")}
          className="text-slate-500"
        >
          {busy === "dismiss" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <X className="h-3.5 w-3.5" aria-hidden />
          )}
          Bỏ qua
        </Button>
        {isComposerHandoff ? (
          <Button asChild size="sm" variant="default">
            <Link href={`/ung-vien/${p.candidate_id}`}>
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {meta.approveLabel}
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={busy !== null}
            onClick={() => run("execute")}
          >
            {busy === "execute" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : null}
            {meta.approveLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

interface SlotShape {
  start: string;
  calendar_checked?: boolean;
}

function SlotPicker({
  payload,
  value,
  onChange,
}: {
  payload: Record<string, unknown>;
  value: number;
  onChange: (i: number) => void;
}) {
  const slots = (payload.slots as SlotShape[] | undefined) ?? [];
  if (slots.length === 0) return null;
  const checked = slots.some((s) => s.calendar_checked);
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {slots.map((s, i) => {
          const past = Date.parse(s.start) <= Date.now();
          return (
            <button
              key={s.start}
              type="button"
              disabled={past}
              onClick={() => onChange(i)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                i === value
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-300",
                past && "line-through opacity-40",
              )}
              aria-pressed={i === value}
            >
              {formatDateTime(s.start)}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {checked
          ? "Đã đối chiếu lịch Outlook của người phỏng vấn"
          : "Chưa đối chiếu được lịch Outlook — giờ hành chính"}
      </p>
    </div>
  );
}

/** Expanded "Vì sao?" + kind-specific detail. */
function ProposalDetail({ proposal: p }: { proposal: FeedProposal }) {
  return (
    <div className="mt-3 space-y-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
      {p.reasoning ? (
        <p lang="vi">
          <span className="font-semibold text-slate-700">Vì sao? </span>
          {p.reasoning}
        </p>
      ) : null}
      {p.kind === "start_approval" ? <EvalDigest payload={p.payload} /> : null}
      {p.kind === "nudge_stale" ? <NudgePreview payload={p.payload} /> : null}
      {p.kind === "job_from_intent" ? <JobPreview payload={p.payload} /> : null}
    </div>
  );
}

function EvalDigest({ payload }: { payload: Record<string, unknown> }) {
  const evals =
    (payload.evaluations as Array<{
      recommendation: string | null;
      strengths: string | null;
      concerns: string | null;
    }>) ?? [];
  if (evals.length === 0) return null;
  const recLabel = t.recommendation as Record<string, string>;
  return (
    <ul className="space-y-1">
      {evals.map((e, i) => (
        <li key={i}>
          <span className="font-medium">{recLabel[e.recommendation ?? ""] ?? "—"}</span>
          {e.strengths ? ` · Điểm mạnh: ${e.strengths}` : ""}
          {e.concerns ? ` · Lưu ý: ${e.concerns}` : ""}
        </li>
      ))}
    </ul>
  );
}

function NudgePreview({ payload }: { payload: Record<string, unknown> }) {
  const email = payload.email as { subject?: string; body_html?: string } | undefined;
  if (!email?.subject) {
    return <p>Duyệt sẽ gửi thông báo nhắc tới những người phụ trách hồ sơ này.</p>;
  }
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-700">Email sẽ gửi: {email.subject}</p>
      <div
        className="rounded border border-slate-200 bg-white p-2 [&_p]:mb-1"
        // Agent-composed static copy (no user input) — same trust level as templates.
        dangerouslySetInnerHTML={{ __html: email.body_html ?? "" }}
      />
    </div>
  );
}

function JobPreview({ payload }: { payload: Record<string, unknown> }) {
  const job = payload.job_input as
    | {
        title?: string;
        headcount?: number;
        location?: string | null;
        salary_min?: number | null;
        salary_max?: number | null;
        description?: string;
      }
    | undefined;
  if (!job) return null;
  const salary =
    job.salary_min || job.salary_max
      ? `${formatVND(job.salary_min ?? 0)} – ${formatVND(job.salary_max ?? 0)}`
      : "Thỏa thuận";
  return (
    <div className="space-y-1.5">
      <p>
        <span className="font-medium text-slate-700">{job.title}</span> · {job.headcount ?? 1} người
        · {job.location || "chưa rõ địa điểm"} · {salary}
      </p>
      {job.description ? (
        <div
          className="max-h-48 overflow-y-auto rounded border border-slate-200 bg-white p-2 [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-1"
          // AI-drafted through cleanAiHtml (script/style stripped server-side).
          dangerouslySetInnerHTML={{ __html: job.description }}
        />
      ) : null}
    </div>
  );
}
