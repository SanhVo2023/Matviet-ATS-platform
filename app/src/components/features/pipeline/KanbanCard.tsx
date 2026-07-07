"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/vi-format";
import { stageReadiness, type Stage, type ReadinessTone } from "@/lib/validation/candidate";
import { t } from "@/lib/i18n";
import type { CandidateRow } from "@/server/candidates/repository";

interface Props {
  candidate: CandidateRow;
  /** When true, card is rendered inside <DragOverlay> — disable hover styles + interactivity. */
  overlay?: boolean;
}

/** Status dot — ALWAYS paired with the label next to it (color-blind safe). */
const DOT_CLASS: Record<ReadinessTone, string> = {
  ready: "bg-emerald-500",
  waiting: "bg-slate-300",
  blocked: "bg-rose-500",
  done: "bg-emerald-600 ring-2 ring-emerald-200",
};

const LABEL_CLASS: Record<ReadinessTone, string> = {
  ready: "text-emerald-700",
  waiting: "text-slate-500",
  blocked: "text-rose-600",
  done: "text-emerald-700",
};

/**
 * Compact 2-line card (Sanh 2026-07-07): name + AI score, then the readiness
 * dot + label + relative time. Contact details live on the detail page; the
 * detailed sub-stage is the tooltip.
 */
export function KanbanCard({ candidate, overlay }: Props) {
  const reduceMotion = useReducedMotion();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: candidate.id,
    data: { type: "candidate", stage: candidate.current_stage },
    disabled: overlay,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const readiness = stageReadiness(candidate.current_stage as Stage, candidate.ai_screening_status);

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      className={cn("group relative", !overlay && isDragging && "opacity-30")}
    >
      {/*
        dnd-kit owns the outer transform (sortable move); framer-motion only
        animates the inner card on hover so the two never fight. The dragging
        preview is styled with plain CSS classes on the overlay card.
      */}
      <motion.div
        whileHover={overlay || reduceMotion ? undefined : { y: -2 }}
        title={`${candidate.full_name} — ${t.stage[candidate.current_stage]}`}
        className={cn(
          "relative cursor-grab rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs shadow-sm",
          "active:cursor-grabbing",
          overlay && "rotate-2 scale-[1.02] cursor-grabbing shadow-lg ring-2 ring-primary-300",
          !overlay && "transition-shadow hover:border-primary-300 hover:shadow-md",
        )}
      >
        {/* Line 1 — name + AI score */}
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-brand-900">
            {candidate.full_name}
          </p>
          {candidate.ai_score != null ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-brand-900 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-accent-400">
              {Math.round(candidate.ai_score)}
            </span>
          ) : null}
        </div>

        {/* Line 2 — readiness dot + label + relative time */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={cn("h-2 w-2 shrink-0 rounded-full", DOT_CLASS[readiness.tone])}
            aria-hidden
          />
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[11px] font-medium",
              LABEL_CLASS[readiness.tone],
            )}
          >
            {readiness.label}
          </span>
          <span className="shrink-0 text-[10px] text-slate-400">
            {formatRelative(candidate.updated_at)}
          </span>
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
      </motion.div>
    </div>
  );
}
