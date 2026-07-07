import Link from "next/link";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — icon + title + subtitle + trailing action (design-language §4.5).
 * Server-safe (no client hooks); pass any action element (button, link…).
 * `back` renders a chevron link in front of the title — every detail page
 * gets a proper way back (Sanh 2026-07-07).
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  back,
  backLabel,
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  /** href to navigate back to (renders a chevron button before the title) */
  back?: string;
  /** accessible label for the back link (default "Quay lại") */
  backLabel?: string;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex items-start gap-3">
        {back && (
          <Link
            href={back}
            aria-label={backLabel ?? "Quay lại"}
            title={backLabel ?? "Quay lại"}
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
        )}
        {Icon && (
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-900 text-accent-400">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900 lg:text-[1.7rem]">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
