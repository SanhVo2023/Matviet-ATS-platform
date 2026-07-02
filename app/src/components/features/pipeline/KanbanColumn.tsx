"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { Stage } from "@/lib/validation/candidate";
import type { CandidateRow } from "@/server/candidates/repository";
import { KanbanCard } from "./KanbanCard";

interface Props {
  stage: Stage;
  candidates: CandidateRow[];
  /** When false, dropping onto this column is rejected client-side (validation) — visual cue only. */
  acceptsDrop: boolean;
  /** Currently dragging-over this column? */
  isOver?: boolean;
}

const STAGE_ACCENT: Record<string, string> = {
  new: "border-slate-300",
  screening: "border-primary-300",
  screened: "border-primary-400",
  interview_scheduled: "border-amber-300",
  interviewed: "border-amber-400",
  test_sent: "border-violet-300",
  test_done: "border-violet-400",
  recommended: "border-indigo-300",
  salary_deal: "border-indigo-400",
  bod_review: "border-indigo-500",
  tap_doan_review: "border-indigo-600",
  offer_sent: "border-emerald-400",
  offer_accepted: "border-emerald-500",
  hired: "border-emerald-600",
  rejected: "border-rose-400",
  withdrew: "border-zinc-400",
};

export function KanbanColumn({ stage, candidates, acceptsDrop }: Props) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({
    id: stage,
    data: { type: "stage", stage },
    disabled: !acceptsDrop,
  });

  const accent = STAGE_ACCENT[stage] ?? "border-slate-300";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-md bg-slate-50",
        "border-t-2",
        accent,
        dndIsOver && acceptsDrop && "bg-primary-50/60 ring-2 ring-primary-300",
        dndIsOver && !acceptsDrop && "bg-rose-50 ring-2 ring-rose-300",
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          {t.stage[stage]}
        </p>
        <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-slate-600">
          {candidates.length}
        </span>
      </div>

      {/* Card list */}
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
