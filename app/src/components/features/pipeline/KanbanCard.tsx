"use client";

import * as React from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Mail, Phone, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScoringStatusPill } from "@/components/features/scoring/ScoringStatusPill";
import { cn } from "@/lib/utils";
import { initials, formatRelative } from "@/lib/vi-format";
import { t } from "@/lib/i18n";
import type { CandidateRow } from "@/server/candidates/repository";

interface Props {
  candidate: CandidateRow;
  /** When true, card is rendered inside <DragOverlay> — disable hover styles + interactivity. */
  overlay?: boolean;
}

export function KanbanCard({ candidate, overlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: candidate.id,
    data: { type: "candidate", stage: candidate.current_stage },
    disabled: overlay,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      className={cn(
        "group relative cursor-grab rounded-md border border-slate-200 bg-white p-3 text-left text-xs shadow-sm",
        "active:cursor-grabbing",
        overlay && "rotate-2 cursor-grabbing shadow-xl ring-2 ring-primary-300",
        !overlay && isDragging && "opacity-30",
        !overlay && "hover:border-primary-300 hover:shadow-md",
      )}
    >
      {/* Header — avatar + name + score */}
      <div className="flex items-start gap-2">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-[10px]">{initials(candidate.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">{candidate.full_name}</p>
          <p className="truncate text-[10px] uppercase tracking-wide text-slate-500">
            {t.source[candidate.source]}
          </p>
        </div>
        {candidate.ai_score != null ? (
          <span className="inline-flex shrink-0 items-center rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-slate-800">
            {Math.round(candidate.ai_score)}
          </span>
        ) : null}
      </div>

      {/* Body — contact + scoring status */}
      <div className="mt-2 space-y-1 text-[11px] text-slate-500">
        {candidate.email ? (
          <div className="flex items-center gap-1.5 truncate">
            <Mail className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{candidate.email}</span>
          </div>
        ) : null}
        {candidate.phone ? (
          <div className="flex items-center gap-1.5 truncate">
            <Phone className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{candidate.phone}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
          <Calendar className="h-3 w-3" aria-hidden />
          {formatRelative(candidate.updated_at)}
        </span>
        <ScoringStatusPill status={candidate.ai_screening_status} />
      </div>

      {/*
        Click-to-detail without breaking drag: a transparent link covers the
        card body, but pointer-events-none in dragging state keeps drag from
        triggering a navigation. Lives behind the drag handle (z-0).
      */}
      {!overlay ? (
        <Link
          href={`/ung-vien/${candidate.id}`}
          aria-label={`Xem chi tiết ${candidate.full_name}`}
          className="absolute inset-0 z-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            // Block link navigation if a drag has actually started.
            if (isDragging) e.preventDefault();
          }}
        />
      ) : null}
    </div>
  );
}
