import { Skeleton, SkeletonHeader, SkeletonTable } from "@/components/primitives/Skeleton";

/** Leave list outline: header, status filter, table. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6 lg:p-8" aria-busy="true">
      <SkeletonHeader />
      <Skeleton className="h-10 w-44" />
      <SkeletonTable rows={6} />
    </div>
  );
}
