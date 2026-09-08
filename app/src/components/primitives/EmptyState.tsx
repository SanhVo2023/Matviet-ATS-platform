import { Briefcase } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Illustration, type IllustrationKind } from "@/components/brand/illustrations";

interface EmptyStateProps {
  icon?: LucideIcon;
  /** One of the brand illustration scenes; replaces the icon circle when set. */
  illustration?: IllustrationKind;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Empty state — calm, not an error; sometimes the day is quiet. Pass an
 * `illustration` for a module's primary empty view (candidates, employees,
 * leave…); the icon circle stays for secondary/inline empties.
 */
export function EmptyState({
  icon: Icon = Briefcase,
  illustration,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-white px-6 py-14 text-center",
        className,
      )}
    >
      {illustration ? (
        <Illustration kind={illustration} />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-400">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      )}
      <div className="max-w-md space-y-1">
        <p className="text-base font-semibold text-slate-700">{title}</p>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
