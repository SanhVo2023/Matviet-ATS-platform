"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setJobStatusAction } from "@/app/(dashboard)/vi-tri/actions";
import { t } from "@/lib/i18n";
import type { Database } from "@/types/db";

type JobStatus = Database["public"]["Enums"]["job_status"];

export function JobStatusActions({ jobId, status }: { jobId: string; status: JobStatus }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const change = async (next: JobStatus) => {
    setPending(true);
    const r = await setJobStatusAction(jobId, next);
    setPending(false);
    if (!r.ok) toast.error(r.error);
    else toast.success(t.success.saved);
    router.refresh();
  };

  if (status === "open")
    return (
      <Button variant="outline" disabled={pending} onClick={() => change("paused")}>
        <Pause className="h-4 w-4" aria-hidden /> Tạm dừng
      </Button>
    );

  if (status === "paused")
    return (
      <Button variant="outline" disabled={pending} onClick={() => change("open")}>
        <Play className="h-4 w-4" aria-hidden /> Mở lại
      </Button>
    );

  if (status === "draft")
    return (
      <Button disabled={pending} onClick={() => change("open")}>
        <Play className="h-4 w-4" aria-hidden /> Đăng tuyển
      </Button>
    );

  if (status === "closed" || status === "filled")
    return (
      <Button variant="outline" disabled={pending} onClick={() => change("open")}>
        <Play className="h-4 w-4" aria-hidden /> Mở lại
      </Button>
    );

  return (
    <Button variant="outline" disabled={pending} onClick={() => change("closed")}>
      <X className="h-4 w-4" aria-hidden /> Đóng
    </Button>
  );
}
