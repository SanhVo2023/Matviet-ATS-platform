import { Skeleton, SkeletonHeader, SkeletonTable } from "@/components/primitives/Skeleton";
import { PageContainer } from "@/components/primitives/PageContainer";

/** Leave list outline: header, status filter, table. */
export default function Loading() {
  return (
    <PageContainer size="default" className="space-y-5" aria-busy="true">
      <SkeletonHeader />
      <Skeleton className="h-10 w-44" />
      <SkeletonTable rows={6} />
    </PageContainer>
  );
}
