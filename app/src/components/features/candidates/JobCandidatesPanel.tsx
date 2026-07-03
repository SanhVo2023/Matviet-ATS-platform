"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StageBadge } from "@/components/primitives/StatusBadge";
import { ScoringStatusPill } from "@/components/features/scoring/ScoringStatusPill";
import { CandidateUploadDialog } from "./CandidateUploadDialog";
import type { CandidateRow } from "@/server/candidates/repository";
import { initials, formatRelative } from "@/lib/vi-format";

interface JobOption {
  id: string;
  title: string;
  status: string;
}

interface Props {
  jobId: string;
  jobs: JobOption[];
  candidates: CandidateRow[];
  /** When true, hide the "+ Tải lên ứng viên" CTA (e.g. for read-only roles). */
  readOnly?: boolean;
}

export function JobCandidatesPanel({ jobId, jobs, candidates, readOnly }: Props) {
  const [uploadOpen, setUploadOpen] = React.useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {candidates.length === 0
            ? "Chưa có ứng viên nào nộp cho vị trí này."
            : `${candidates.length} ứng viên`}
        </p>
        {!readOnly ? (
          <Button onClick={() => setUploadOpen(true)} size="sm" variant="navy">
            <Plus className="h-4 w-4" aria-hidden /> Tải lên ứng viên
          </Button>
        ) : null}
      </div>

      {candidates.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {candidates.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
            >
              <Link href={`/ung-vien/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback>{initials(c.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{c.full_name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {c.email ?? "—"} · Nộp {formatRelative(c.created_at)}
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-3">
                {c.ai_score != null ? (
                  <span className="font-mono text-sm tabular-nums text-slate-700">
                    {Math.round(c.ai_score)}
                  </span>
                ) : null}
                <ScoringStatusPill status={c.ai_screening_status} />
                <StageBadge stage={c.current_stage} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <CandidateUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultJobId={jobId}
        jobs={jobs}
      />
    </div>
  );
}
