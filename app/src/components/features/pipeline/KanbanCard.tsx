"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/vi-format";
import { READINESS_DOT, READINESS_TEXT } from "@/lib/stage-visuals";
import { allowedNextStages, type Stage } from "@/lib/validation/candidate";
import { changeStageAction } from "@/app/(dashboard)/ung-vien/actions";
import { t } from "@/lib/i18n";
import type { CandidateWithStatus } from "@/server/candidates/repository";

interface Props {
  candidate: CandidateWithStatus;
  /** When true, card is rendered inside <DragOverlay> — disable hover styles + interactivity. */
  overlay?: boolean;
}

/**
 * Compact 2-line card: name + AI score, then the derived status (waiting-on +
 * days). Renovation R4/3a: the drag listeners live on an explicit GRIP HANDLE
 * (not a full-card overlay that swallowed pointerdown — the old overlay Link
 * broke drag entirely); the name is the navigation link; a native stage
 * <select> under `md` makes the board usable without dragging on a phone.
 */
export function KanbanCard({ candidate, overlay }: Props) {
  const router = useRouter();
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

  const readiness = candidate.derived;
  // Mobile quick-move: forward stages that don't need a reason dialog.
  const mobileTargets = allowedNextStages(candidate.current_stage as Stage).filter(
    (s) => s !== "rejected",
  );

  const onMobileStage = (next: Stage) => {
    void changeStageAction(candidate.id, next).then((r) => {
      if (r.ok) {
        toast.success(t.success.saved);
        router.refresh();
      } else toast.error(r.error);
    });
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={cn("group relative", !overlay && isDragging && "opacity-30")}
    >
      <motion.div
        whileHover={overlay || reduceMotion ? undefined : { y: -2 }}
        className={cn(
          "relative rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left text-xs shadow-sm",
          overlay && "rotate-2 scale-[1.02] shadow-lg ring-2 ring-primary-300",
          !overlay && "transition-shadow hover:border-primary-300 hover:shadow-md",
        )}
      >
        <div className="flex items-start gap-1.5">
          {/* Drag handle — holds the dnd-kit listeners (touch-action:none so
              touch-drag doesn't get claimed by column scroll). ≥40px hit area. */}
          {!overlay ? (
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Kéo để chuyển giai đoạn ${candidate.full_name}`}
              style={{ touchAction: "none" }}
              className="mt-0.5 hidden h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-slate-300 hover:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 active:cursor-grabbing md:flex"
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <GripVertical
              className="mt-0.5 hidden h-4 w-5 shrink-0 text-slate-300 md:block"
              aria-hidden
            />
          )}

          <div className="min-w-0 flex-1">
            {/* Line 1 — name (navigation link) + AI score */}
            <div className="flex items-center gap-2">
              {overlay ? (
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-brand-900">
                  {candidate.full_name}
                </p>
              ) : (
                <Link
                  href={`/ung-vien/${candidate.id}`}
                  className="min-w-0 flex-1 truncate text-[13px] font-semibold text-brand-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                >
                  {candidate.full_name}
                </Link>
              )}
              {candidate.ai_score != null ? (
                <span className="inline-flex shrink-0 items-center rounded-full bg-brand-900 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-accent-400">
                  {Math.round(candidate.ai_score)}
                </span>
              ) : null}
            </div>

            {/* Line 2 — readiness dot + label + days + relative time */}
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", READINESS_DOT[readiness.tone])}
                aria-hidden
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[11px] font-medium",
                  READINESS_TEXT[readiness.tone],
                )}
              >
                {readiness.label}
                {(readiness.tone === "waiting" || readiness.tone === "blocked") &&
                readiness.daysWaiting > 0
                  ? ` · ${readiness.daysWaiting} ngày`
                  : ""}
              </span>
              <span className="shrink-0 text-[10px] text-slate-500">
                {formatRelative(candidate.updated_at)}
              </span>
            </div>

            {/* Mobile-only quick stage move (< md — no drag handle there). */}
            {!overlay && mobileTargets.length > 0 ? (
              <select
                aria-label={`Chuyển giai đoạn ${candidate.full_name}`}
                value=""
                onChange={(e) => {
                  if (e.target.value) onMobileStage(e.target.value as Stage);
                }}
                className="mt-2 h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-ring md:hidden"
              >
                <option value="">Chuyển sang…</option>
                {mobileTargets.map((s) => (
                  <option key={s} value={s}>
                    {t.stage[s]}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
