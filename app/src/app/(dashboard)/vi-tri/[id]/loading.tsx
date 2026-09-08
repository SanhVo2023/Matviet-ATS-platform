import { Skeleton, SkeletonHeader } from "@/components/primitives/Skeleton";

/** Job workspace (kanban) outline: header + 4 columns of cards. */
export default function Loading() {
  return (
    <div className="space-y-5 p-6 lg:p-8" aria-busy="true">
      <SkeletonHeader />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="w-80 shrink-0 space-y-2 rounded-lg bg-slate-100/70 p-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            <Skeleton className="h-3 w-56" />
            {Array.from({ length: col === 2 ? 1 : 4 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-9 rounded-full" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
