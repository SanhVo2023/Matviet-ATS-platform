import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { Database } from "@/types/db";

type Status = Database["public"]["Enums"]["ai_screening_status"];

const PILL = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium";

export function ScoringStatusPill({ status }: { status: Status }) {
  if (status === "pending") {
    return (
      <span className={cn(PILL, "bg-primary-50 text-primary-800")} aria-live="polite">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        {t.score.pending}
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className={cn(PILL, "bg-rose-50 text-rose-700")}>
        <AlertTriangle className="h-3 w-3" aria-hidden />
        {t.score.failed}
      </span>
    );
  }
  // success — no pill, the score number is the indicator.
  return null;
}
