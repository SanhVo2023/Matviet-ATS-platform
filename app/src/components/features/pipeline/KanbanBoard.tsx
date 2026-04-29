"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ALL_STAGES, allowedNextStages, type Stage } from "@/lib/validation/candidate";
import type { CandidateRow } from "@/server/candidates/repository";
import { changeStageAction } from "@/app/(dashboard)/ung-vien/actions";
import { t } from "@/lib/i18n";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";

interface Props {
  candidates: CandidateRow[];
  /** Job context — used in error messages + future bulk actions. */
  jobId: string;
}

/** Order columns left-to-right. Hides 'screening' if no rows (system-only transient). */
function visibleStages(grouped: Record<Stage, CandidateRow[]>): Stage[] {
  return ALL_STAGES.filter((s) => {
    if (s === "screening") return grouped[s]?.length > 0;
    return true;
  });
}

function groupByStage(rows: CandidateRow[]): Record<Stage, CandidateRow[]> {
  const out = Object.fromEntries(ALL_STAGES.map((s) => [s, [] as CandidateRow[]])) as Record<
    Stage,
    CandidateRow[]
  >;
  for (const r of rows) {
    out[r.current_stage as Stage]?.push(r);
  }
  return out;
}

export function KanbanBoard({ candidates: initial }: Props) {
  const router = useRouter();
  const [rows, setRows] = React.useState<CandidateRow[]>(initial);
  React.useEffect(() => setRows(initial), [initial]);

  const grouped = React.useMemo(() => groupByStage(rows), [rows]);
  const stages = visibleStages(grouped);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const activeCard = React.useMemo(
    () => (activeId ? (rows.find((r) => r.id === activeId) ?? null) : null),
    [activeId, rows],
  );

  // 5px activation distance → click-to-link is unaffected by accidental tiny drags.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    // The droppable id IS the target stage code (set in KanbanColumn).
    const targetStage = String(over.id) as Stage;
    if (!ALL_STAGES.includes(targetStage)) return;

    const card = rows.find((r) => r.id === active.id);
    if (!card) return;
    if (card.current_stage === targetStage) return; // dropped back into source col

    const allowed = allowedNextStages(card.current_stage as Stage);
    if (!allowed.includes(targetStage)) {
      toast.error(
        `Không thể chuyển từ "${t.stage[card.current_stage as Stage]}" sang "${t.stage[targetStage]}"`,
      );
      return;
    }

    // Optimistic move — replace the card's stage in local state.
    const prevRows = rows;
    setRows((current) =>
      current.map((r) => (r.id === card.id ? { ...r, current_stage: targetStage } : r)),
    );

    const res = await changeStageAction(card.id, targetStage);
    if (!res.ok) {
      setRows(prevRows);
      toast.error(res.error);
      return;
    }
    toast.success(t.success.saved);
    router.refresh();
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100vh-12rem)] gap-3 overflow-x-auto px-1 pb-3">
        {stages.map((s) => {
          const acceptsDrop =
            !activeCard ||
            allowedNextStages(activeCard.current_stage as Stage).includes(s) ||
            activeCard.current_stage === s;
          return (
            <KanbanColumn
              key={s}
              stage={s}
              candidates={grouped[s] ?? []}
              acceptsDrop={acceptsDrop}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? <KanbanCard candidate={activeCard} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
