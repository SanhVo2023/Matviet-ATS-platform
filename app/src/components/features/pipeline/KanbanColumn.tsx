"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { StageGroup } from "@/lib/validation/candidate";
import type { CandidateRow } from "@/server/candidates/repository";
import { KanbanCard } from "./KanbanCard";

interface Props {
  group: StageGroup;
  candidates: CandidateRow[];
  /** When false, dropping onto this column is rejected client-side (validation) — visual cue only. */
  acceptsDrop: boolean;
}

/** One accent per super-column (ADR 0015). */
const GROUP_ACCENT: Record<string, string> = {
  g_new: "border-slate-300",
  g_screen: "border-primary-400",
  g_interview: "border-amber-400",
  g_approval: "border-indigo-400",
  g_offer: "border-emerald-400",
  g_hired: "border-emerald-600",
  g_closed: "border-rose-400",
};

export function KanbanColumn({ group, candidates, acceptsDrop }: Props) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({
    id: group.id,
    data: { type: "group", group: group.id },
    disabled: !acceptsDrop,
  });

  const accent = GROUP_ACCENT[group.id] ?? "border-slate-300";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-lg bg-slate-100/70",
        "border-t-2",
        accent,
        dndIsOver && acceptsDrop && "bg-primary-50/60 ring-2 ring-primary-300",
        dndIsOver && !acceptsDrop && "bg-rose-50 ring-2 ring-rose-300",
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {group.label}
        </p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600 shadow-sm">
          {candidates.length}
        </span>
      </div>

      {/* Card list — cards carry their detailed StageBadge */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3 pt-1">
        <SortableContext items={candidates.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {candidates.length === 0 ? (
            <p className="rounded border border-dashed border-slate-200 bg-white/60 py-4 text-center text-[11px] text-slate-400">
              Trống
            </p>
          ) : (
            candidates.map((c) => <KanbanCard key={c.id} candidate={c} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
}
