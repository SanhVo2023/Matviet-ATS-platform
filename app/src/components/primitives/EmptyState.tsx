import { Briefcase } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Placeholder empty state. Until the designer delivers the SVG illustrations
 * called for in docs/ui-ux.md §10.5, we render a soft circular icon. Style
 * is intentionally calm — empty isn't an error; sometimes the day is quiet.
 */
export function EmptyState({
  icon: Icon = Briefcase,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-white px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-400">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-700">{title}</p>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
