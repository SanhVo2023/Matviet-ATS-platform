"use client";

import * as React from "react";
import { Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/vi-format";
import { summarizeCandidateAction } from "@/app/(dashboard)/ung-vien/[id]/actions";

interface Props {
  candidateId: string;
  /** Persisted summary (ambient AI, ADR 0018) — seeded by the scoring worker. */
  initialSummary?: string | null;
  summaryAt?: string | null;
}

/**
 * AI narrative of the candidate (highlights, risks, next step). Ambient AI
 * (ADR 0018): scoring seeds it automatically; "Tóm tắt lại" re-reads the
 * whole dossier (notes, interviews, salary talks) and persists the richer
 * version — useful as the candidate moves through the pipeline.
 */
export function CandidateAiSummary({ candidateId, initialSummary, summaryAt }: Props) {
  const [summary, setSummary] = React.useState<string | null>(initialSummary?.trim() || null);
  const [freshAt, setFreshAt] = React.useState<string | null>(summaryAt ?? null);
  const [loading, setLoading] = React.useState(false);

  const handleSummarize = async () => {
    setLoading(true);
    const res = await summarizeCandidateAction(candidateId);
    setLoading(false);
    if (res.ok && res.data) {
      setSummary(res.data.summary);
      setFreshAt(new Date().toISOString());
    } else {
      toast.error(res.ok ? "Không tóm tắt được hồ sơ" : res.error);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-accent-500" aria-hidden />
          Tóm tắt AI
          {summary && freshAt ? (
            <span className="font-normal normal-case tracking-normal text-slate-400">
              · AI viết {formatRelative(freshAt)}
            </span>
          ) : null}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSummarize}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCcw className="h-4 w-4" aria-hidden />
          )}
          {loading ? "Đang tóm tắt..." : summary ? "Tóm tắt lại" : "Tóm tắt ngay"}
        </Button>
      </div>
      {summary ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700" lang="vi">
          {summary}
        </p>
      ) : (
        !loading && (
          <p className="mt-2 text-xs text-slate-500">
            AI sẽ tự viết tóm tắt sau khi chấm điểm xong — hoặc bấm &quot;Tóm tắt ngay&quot;.
          </p>
        )
      )}
    </div>
  );
}
