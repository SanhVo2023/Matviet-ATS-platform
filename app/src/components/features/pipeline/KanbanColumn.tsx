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

/** One accent per business column (Sanh 2026-07-07). */
const GROUP_ACCENT: Record<string, string> = {
  g_intake: "border-slate-400",
  g_eval: "border-amber-400",
  g_offer: "border-indigo-400",
  g_onboard: "border-emerald-500",
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
        "flex h-full w-80 shrink-0 flex-col rounded-lg bg-slate-100/70",
        "border-t-2",
        accent,
        dndIsOver && acceptsDrop && "bg-primary-50/60 ring-2 ring-primary-300",
        dndIsOver && !acceptsDrop && "bg-rose-50 ring-2 ring-rose-300",
      )}
    >
      {/* Column header — emoji + business label + count, description below */}
      <div className="px-3 pb-2 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <span className="mr-1" aria-hidden>
              {group.icon}
            </span>
            {group.label}
          </p>
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600 shadow-sm">
            {candidates.length}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">
          {group.description}
        </p>
      </div>

      {/* Card list — compact cards with readiness dots */}
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
