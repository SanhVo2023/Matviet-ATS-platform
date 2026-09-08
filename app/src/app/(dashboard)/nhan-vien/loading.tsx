import { Skeleton, SkeletonHeader, SkeletonTable } from "@/components/primitives/Skeleton";
import { PageContainer } from "@/components/primitives/PageContainer";

/** Employees list outline: header, stats strip, filters, table. */
export default function Loading() {
  return (
    <PageContainer size="default" className="space-y-5" aria-busy="true">
      <SkeletonHeader />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-40" />
      </div>
      <SkeletonTable rows={8} />
    </PageContainer>
  );
}
