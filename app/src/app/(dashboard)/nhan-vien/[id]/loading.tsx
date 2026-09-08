import { Skeleton, SkeletonCard } from "@/components/primitives/Skeleton";

/** Employee profile outline: identity header + card grid. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8" aria-busy="true">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} lines={i < 2 ? 6 : 3} />
        ))}
      </div>
    </div>
  );
}
