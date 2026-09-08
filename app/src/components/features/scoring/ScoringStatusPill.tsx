import { Loader2, AlertTriangle } from "lucide-react";
import { StatusPill } from "@/components/primitives/StatusPill";
import { t } from "@/lib/i18n";
import type { Database } from "@/types/db";

type Status = Database["public"]["Enums"]["ai_screening_status"];

export function ScoringStatusPill({ status }: { status: Status }) {
  if (status === "pending") {
    return (
      <StatusPill tone="info" size="sm" aria-live="polite">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        {t.score.pending}
      </StatusPill>
    );
  }
  if (status === "failed") {
    return (
      <StatusPill tone="error" size="sm" icon={AlertTriangle}>
        {t.score.failed}
      </StatusPill>
    );
  }
  // success — no pill, the score number is the indicator.
  return null;
}
