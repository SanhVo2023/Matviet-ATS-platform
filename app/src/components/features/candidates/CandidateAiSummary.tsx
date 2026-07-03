"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { summarizeCandidateAction } from "@/app/(dashboard)/ung-vien/[id]/actions";

interface Props {
  candidateId: string;
}

/**
 * On-demand AI summary of the candidate (highlights, risks, next step).
 * Client-only state — nothing is persisted.
 */
export function CandidateAiSummary({ candidateId }: Props) {
  const [summary, setSummary] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSummarize = async () => {
    setLoading(true);
    const res = await summarizeCandidateAction(candidateId);
    setLoading(false);
    if (res.ok && res.data) {
      setSummary(res.data.summary);
    } else {
      toast.error(res.ok ? "Không tóm tắt được hồ sơ" : res.error);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tóm tắt AI</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSummarize}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          {loading ? "Đang tóm tắt..." : summary ? "Tóm tắt lại" : "Tóm tắt AI"}
        </Button>
      </div>
      {summary ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700" lang="vi">
          {summary}
        </p>
      ) : (
        !loading && (
          <p className="mt-2 text-xs text-slate-500">
            AI tóm tắt điểm nổi bật, rủi ro và đề xuất bước tiếp theo từ CV + kết quả chấm điểm.
          </p>
        )
      )}
    </div>
  );
}
