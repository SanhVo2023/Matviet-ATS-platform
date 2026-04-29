"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { RescoreButton } from "./RescoreButton";

interface Props {
  candidateId: string;
  /** ISO timestamp of when scoring was enqueued — used to gate the "taking too long" hint. */
  enqueuedAt: string | null;
}

const POLL_MS = 3_000;
const TOO_LONG_MS = 60_000;

/**
 * Soft polling: every 3s the page server-component re-runs (router.refresh()),
 * which re-fetches the candidate's screening status. Polling stops naturally
 * once status flips to success/failed (parent re-renders without this component).
 */
export function ScoringPending({ candidateId, enqueuedAt }: Props) {
  const router = useRouter();
  const [tooLong, setTooLong] = React.useState(false);

  React.useEffect(() => {
    const enqueuedTime = enqueuedAt ? new Date(enqueuedAt).getTime() : Date.now();
    const interval = setInterval(() => {
      router.refresh();
      if (Date.now() - enqueuedTime > TOO_LONG_MS) setTooLong(true);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [router, enqueuedAt]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-primary-200 bg-primary-50/40 p-8 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary-600" aria-hidden />
      <div>
        <p className="text-sm font-medium text-primary-900">{t.score.pending}</p>
        <p className="mt-1 text-xs text-slate-500">{t.score.runningHint}</p>
      </div>
      {tooLong ? (
        <div className="mt-2 flex flex-col items-center gap-2">
          <p className="text-xs text-amber-700">{t.score.runningTakingTooLong}</p>
          <RescoreButton candidateId={candidateId} variant="retry" />
        </div>
      ) : null}
    </div>
  );
}
