"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@/lib/i18n";

const STATUSES = ["queued", "pending_approval", "sent", "failed"] as const;

export function EmailQueueFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams?.get("status") ?? "";

  const setStatus = (s: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (s) params.set("status", s);
    else params.delete("status");
    const qs = params.toString();
    router.push(qs ? `/email?${qs}` : "/email");
  };

  return (
    <select
      value={current}
      onChange={(e) => setStatus(e.target.value)}
      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
    >
      <option value="">{t.emails.queue.filterAll}</option>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {t.emails.statusLabel[s]}
        </option>
      ))}
    </select>
  );
}
