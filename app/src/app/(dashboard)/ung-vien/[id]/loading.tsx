import { Skeleton, SkeletonCard } from "@/components/primitives/Skeleton";
import { PageContainer } from "@/components/primitives/PageContainer";

/** Candidate ladder outline: header card, 4 rungs, reference rail. */
export default function Loading() {
  return (
    <PageContainer size="wide" className="space-y-5" aria-busy="true">
      <Skeleton className="h-4 w-24" />
      <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-3 lg:col-span-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <SkeletonCard className="flex-1" lines={i === 2 ? 5 : 1} />
            </div>
          ))}
        </div>
        <div className="col-span-12 space-y-4 lg:col-span-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    </PageContainer>
  );
}
