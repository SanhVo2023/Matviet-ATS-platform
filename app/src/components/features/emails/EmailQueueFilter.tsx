"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Segmented } from "@/components/ui/segmented";
import { t } from "@/lib/i18n";

const STATUSES = ["queued", "pending_approval", "sent", "failed"] as const;
type FilterValue = "all" | (typeof STATUSES)[number];

export function EmailQueueFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams?.get("status") ?? "";
  const current: FilterValue = (STATUSES as readonly string[]).includes(raw)
    ? (raw as FilterValue)
    : "all";

  const setStatus = (s: FilterValue) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (s !== "all") params.set("status", s);
    else params.delete("status");
    const qs = params.toString();
    router.push(qs ? `/email?${qs}` : "/email");
  };

  return (
    <Segmented<FilterValue>
      id="email-status"
      aria-label="Lọc theo trạng thái email"
      size="sm"
      value={current}
      onChange={setStatus}
      options={[
        { value: "all", label: t.emails.queue.filterAll },
        ...STATUSES.map((s) => ({ value: s, label: t.emails.statusLabel[s] })),
      ]}
    />
  );
}
