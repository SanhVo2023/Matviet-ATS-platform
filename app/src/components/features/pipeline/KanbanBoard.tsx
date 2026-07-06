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
import {
  STAGE_GROUPS,
  groupOfStage,
  resolveGroupTarget,
  type Stage,
  type StageGroup,
} from "@/lib/validation/candidate";
import type { CandidateRow } from "@/server/candidates/repository";
import { changeStageAction } from "@/app/(dashboard)/ung-vien/actions";
import { startApprovalAction } from "@/app/(dashboard)/phong-van/actions";
import { t } from "@/lib/i18n";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";

interface Props {
  candidates: CandidateRow[];
  /** Job context — used in error messages + future bulk actions. */
  jobId: string;
}

/**
 * 7 super-columns (ADR 0015) — the DB keeps all 16 detailed stages; this is
 * purely how the board displays. Cards show their detailed stage as a badge;
 * the table view's StageDropdown still reaches every sub-stage. Dropping into
 * "Phê duyệt" starts the approval chain (the drag IS the intent).
 */
function groupRows(rows: CandidateRow[]): Record<string, CandidateRow[]> {
  const out = Object.fromEntries(STAGE_GROUPS.map((g) => [g.id, [] as CandidateRow[]]));
  for (const r of rows) {
    out[groupOfStage(r.current_stage as Stage).id]!.push(r);
  }
  return out;
}

export function KanbanBoard({ candidates: initial }: Props) {
  const router = useRouter();
  const [rows, setRows] = React.useState<CandidateRow[]>(initial);
  React.useEffect(() => setRows(initial), [initial]);

  const grouped = React.useMemo(() => groupRows(rows), [rows]);

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

    // Droppable ids are group ids ("g_*") — set in KanbanColumn.
    const group = STAGE_GROUPS.find((g) => g.id === String(over.id));
    if (!group) return;

    const card = rows.find((r) => r.id === active.id);
    if (!card) return;
    const currentStage = card.current_stage as Stage;
    if (group.stages.includes(currentStage)) return; // dropped within own group — no-op

    // "Phê duyệt" drop = start the approval chain (it bumps the stage itself
    // via STAGE_FOR_PENDING_STEP and notifies the first decider).
    if (group.id === "g_approval") {
      const prevRows = rows;
      setRows((cur) =>
        cur.map((r) => (r.id === card.id ? { ...r, current_stage: "recommended" } : r)),
      );
      const res = await startApprovalAction(card.id);
      if (!res.ok) {
        setRows(prevRows);
        toast.error(res.error);
        return;
      }
      if (res.data?.already_started) {
        setRows(prevRows);
        toast.info("Ứng viên này đã có quy trình duyệt.");
      } else {
        toast.success("Đã tạo đề xuất tuyển — người duyệt đã được thông báo.");
      }
      router.refresh();
      return;
    }

    const target = resolveGroupTarget(currentStage, group);
    if (!target) {
      toast.error(`Không thể chuyển từ "${t.stage[currentStage]}" sang cột "${group.label}"`);
      return;
    }

    // Optimistic move — replace the card's stage in local state.
    const prevRows = rows;
    setRows((current) =>
      current.map((r) => (r.id === card.id ? { ...r, current_stage: target } : r)),
    );

    const res = await changeStageAction(card.id, target);
    if (!res.ok) {
      setRows(prevRows);
      toast.error(res.error);
      return;
    }
    toast.success(t.success.saved);
    router.refresh();
  };

  const acceptsDropFor = (group: StageGroup): boolean => {
    if (!activeCard) return true;
    const currentStage = activeCard.current_stage as Stage;
    if (group.stages.includes(currentStage)) return true; // own group = harmless no-op
    return resolveGroupTarget(currentStage, group) !== null;
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100vh-12rem)] gap-3 overflow-x-auto px-1 pb-3">
        {STAGE_GROUPS.map((g) => (
          <KanbanColumn
            key={g.id}
            group={g}
            candidates={grouped[g.id] ?? []}
            acceptsDrop={acceptsDropFor(g)}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? <KanbanCard candidate={activeCard} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
