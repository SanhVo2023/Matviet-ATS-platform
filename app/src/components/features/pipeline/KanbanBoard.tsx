"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive } from "lucide-react";
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
  CLOSED_GROUP,
  groupOfStage,
  resolveGroupTarget,
  type Stage,
  type StageGroup,
} from "@/lib/validation/candidate";
import type { CandidateRow } from "@/server/candidates/repository";
import { changeStageAction } from "@/app/(dashboard)/ung-vien/actions";
import { startApprovalAction } from "@/app/(dashboard)/phong-van/actions";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { IntakeDropCard } from "./IntakeDropCard";

interface Props {
  candidates: CandidateRow[];
  /** Job context — used in error messages + future bulk actions. */
  jobId: string;
}

/**
 * 4 business columns (Sanh 2026-07-07) — the DB keeps all 16 detailed stages;
 * this is purely how the board displays. Cards show a readiness dot+label;
 * the table view's StageDropdown still reaches every sub-stage. Dropping into
 * "Đề nghị làm việc" starts the approval chain (the drag IS the intent).
 * Closed candidates (rejected/withdrew) hide behind the "Đã đóng" toggle —
 * that column is never a drop target (rejecting is a consequential action,
 * done from the detail page/table).
 */
function groupRows(rows: CandidateRow[]): Record<string, CandidateRow[]> {
  const out = Object.fromEntries(
    [...STAGE_GROUPS, CLOSED_GROUP].map((g) => [g.id, [] as CandidateRow[]]),
  );
  for (const r of rows) {
    out[groupOfStage(r.current_stage as Stage).id]!.push(r);
  }
  return out;
}

export function KanbanBoard({ candidates: initial, jobId }: Props) {
  const router = useRouter();
  const [rows, setRows] = React.useState<CandidateRow[]>(initial);
  React.useEffect(() => setRows(initial), [initial]);

  const [showClosed, setShowClosed] = React.useState(false);

  const grouped = React.useMemo(() => groupRows(rows), [rows]);
  const closedCount = grouped[CLOSED_GROUP.id]?.length ?? 0;

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

    // Droppable ids are group ids ("g_*") — set in KanbanColumn. The closed
    // column is droppable-disabled, so it can never arrive here.
    const group = STAGE_GROUPS.find((g) => g.id === String(over.id));
    if (!group) return;

    const card = rows.find((r) => r.id === active.id);
    if (!card) return;
    const currentStage = card.current_stage as Stage;
    if (group.stages.includes(currentStage)) return; // dropped within own group — no-op

    // "Đề nghị làm việc" drop = start the approval chain (it bumps the stage
    // itself via STAGE_FOR_PENDING_STEP and notifies the first decider).
    if (group.id === "g_offer") {
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
    if (group.id === CLOSED_GROUP.id) return false; // never a drop target
    if (!activeCard) return true;
    const currentStage = activeCard.current_stage as Stage;
    if (group.stages.includes(currentStage)) return true; // own group = harmless no-op
    if (group.id === "g_offer") {
      // Starting an approval chain only makes sense moving FORWARD from
      // intake/evaluation — not from onboarding or closed records.
      const cur = groupOfStage(currentStage).id;
      return cur === "g_intake" || cur === "g_eval";
    }
    return resolveGroupTarget(currentStage, group) !== null;
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Board toolbar — closed-records toggle */}
      <div className="mb-2 flex items-center justify-end px-1">
        <button
          type="button"
          onClick={() => setShowClosed((v) => !v)}
          aria-pressed={showClosed}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            showClosed
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
          )}
        >
          <Archive className="h-3.5 w-3.5" aria-hidden />
          Đã đóng ({closedCount})
        </button>
      </div>

      <div className="flex h-[calc(100vh-13rem)] gap-3 overflow-x-auto px-1 pb-3">
        {STAGE_GROUPS.map((g) => (
          <KanbanColumn
            key={g.id}
            group={g}
            candidates={grouped[g.id] ?? []}
            acceptsDrop={acceptsDropFor(g)}
            headerSlot={
              g.id === "g_intake" ? <IntakeDropCard key="intake-drop" jobId={jobId} /> : undefined
            }
          />
        ))}
        {showClosed ? (
          <KanbanColumn
            group={CLOSED_GROUP}
            candidates={grouped[CLOSED_GROUP.id] ?? []}
            acceptsDrop={false}
          />
        ) : null}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? <KanbanCard candidate={activeCard} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
