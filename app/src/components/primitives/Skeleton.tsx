import { cn } from "@/lib/utils";

/**
 * Skeleton — loading placeholder that mirrors the shape of the content it
 * stands in for (asset kit A10/A12). Route-level `loading.tsx` files compose
 * these so a heavy page fades in from its own outline instead of jumping
 * from an unrelated 4-card skeleton.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} aria-hidden />;
}

/** Page header outline: optional icon box, title bar, subtitle bar, trailing action. */
export function SkeletonHeader({ action = true }: { action?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      {action ? <Skeleton className="h-10 w-36" /> : null}
    </div>
  );
}

/** Table outline: a header strip and N rows. */
export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="h-10 border-b border-slate-200 bg-slate-50" />
      <ul className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Card outline with a title bar and a few lines. */
export function SkeletonCard({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-lg border border-slate-200 bg-white p-5", className)}>
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i % 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}
