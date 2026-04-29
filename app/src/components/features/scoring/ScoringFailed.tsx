import { AlertTriangle, FileWarning } from "lucide-react";
import type { Weights } from "@/lib/ai/gemini/types";
import { t } from "@/lib/i18n";
import { RescoreButton } from "./RescoreButton";
import { ManualScoreSliders } from "./ManualScoreSliders";

interface Props {
  candidateId: string;
  reason: string;
  weights: Weights;
  /** True if reason indicates DOCX waiting for the LibreOffice worker. */
  docxBlocked?: boolean;
}

export function ScoringFailed({ candidateId, reason, weights, docxBlocked }: Props) {
  return (
    <div className="space-y-3">
      <div
        className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm"
        role="alert"
      >
        {docxBlocked ? (
          <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
        )}
        <div className="flex-1 space-y-2">
          <p className="font-semibold text-rose-900">{t.score.failed}</p>
          <p className="text-rose-700" lang="vi">
            {docxBlocked ? t.score.docxBlocked : reason}
          </p>
          <RescoreButton candidateId={candidateId} variant="retry" />
        </div>
      </div>

      <ManualScoreSliders candidateId={candidateId} weights={weights} />
    </div>
  );
}
