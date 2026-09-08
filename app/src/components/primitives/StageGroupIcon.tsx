import { GROUP_ICON } from "@/lib/stage-visuals";
import { cn } from "@/lib/utils";

/**
 * The lucide marker for a pipeline business group (kanban column, ladder rung,
 * stage badge). One map in `stage-visuals.ts` → one crisp vocabulary on every
 * OS, replacing the emoji markers. Decorative: callers pair it with the label.
 */
export function StageGroupIcon({ groupId, className }: { groupId: string; className?: string }) {
  const Icon = GROUP_ICON[groupId] ?? GROUP_ICON.g_intake!;
  return <Icon className={cn("h-4 w-4", className)} aria-hidden />;
}
