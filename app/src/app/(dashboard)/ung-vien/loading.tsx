import { Skeleton, SkeletonHeader, SkeletonTable } from "@/components/primitives/Skeleton";

/** Candidates list outline: header, filter bar, table. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6 lg:p-8" aria-busy="true">
      <SkeletonHeader />
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <Skeleton className="h-9 w-72 rounded-full" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="ml-auto h-9 w-64" />
      </div>
      <SkeletonTable rows={10} />
    </div>
  );
}
