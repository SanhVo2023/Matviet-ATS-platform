"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, MapPin, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduleInterviewDialog } from "./ScheduleInterviewDialog";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/vi-format";
import type { InterviewRow } from "@/server/interviews/repository";

interface InterviewerOption {
  id: string;
  full_name: string | null;
  role: string;
}

interface Props {
  candidateId: string;
  candidateName: string;
  interviews: InterviewRow[];
  interviewers: InterviewerOption[];
  /** When false (e.g. read-only role), hide the schedule button. */
  canSchedule?: boolean;
}

export function InterviewsTab({
  candidateId,
  candidateName,
  interviews,
  interviewers,
  canSchedule = true,
}: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {interviews.length === 0
            ? "Chưa có lịch phỏng vấn nào."
            : `${interviews.length} ${t.nav.interviews.toLowerCase()}`}
        </p>
        {canSchedule ? (
          <Button size="sm" variant="navy" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Đặt lịch phỏng vấn
          </Button>
        ) : null}
      </div>

      {interviews.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {interviews.map((iv) => {
            const TypeIcon = iv.type === "video" ? Video : iv.type === "phone" ? Phone : MapPin;
            const isTeams = iv.type === "video" && !!iv.location_or_link;
            return (
              <li key={iv.id}>
                <Link
                  href={`/phong-van/${iv.id}`}
                  className="flex items-start justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <TypeIcon className="mt-1 h-4 w-4 text-slate-400" aria-hidden />
                    <div>
                      <p className="text-sm font-bold tabular-nums text-brand-900">
                        {formatDateTime(iv.scheduled_at)}
                      </p>
                      <p className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                        {iv.duration_min} phút · {t.interviewType[iv.type]}
                        {isTeams ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 font-medium text-accent-700">
                            <Video className="h-3 w-3" aria-hidden /> Teams
                          </span>
                        ) : iv.location_or_link ? (
                          ` · ${iv.location_or_link}`
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                    {t.interviewStatus[iv.status]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ScheduleInterviewDialog
        open={open}
        onOpenChange={setOpen}
        candidateId={candidateId}
        candidateName={candidateName}
        interviewers={interviewers}
      />
    </div>
  );
}
