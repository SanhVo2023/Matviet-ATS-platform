import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface Props {
  text: string;
  verified: boolean;
}

/**
 * Evidence-quote chip. Verified ✓ (emerald) when Gemini's quote was matched
 * against the parsed CV; unverified ⚠ (amber) when fuzzy match failed —
 * surfaces a hallucination risk to HR without blocking the score.
 */
export function EvidenceChip({ text, verified }: Props) {
  const truncated = text.length > 140 ? text.slice(0, 140) + "…" : text;
  return (
    <span
      title={
        verified
          ? `${text}\n\n— ${t.score.evidence.verified}`
          : `${text}\n\n— ${t.score.evidence.tooltip}`
      }
      className={cn(
        "inline-flex max-w-full items-start gap-1.5 rounded-md px-2 py-1 text-xs leading-snug",
        verified
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
          : "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
      )}
      lang="vi"
    >
      {verified ? (
        <Check className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
      ) : (
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
      )}
      <span className="break-words">{truncated}</span>
    </span>
  );
}
