import { LoadingRegion, PageHeaderSkeleton, RowListSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <LoadingRegion label="Loading your orders">
      <PageHeaderSkeleton />
      <div className="mb-3 flex gap-2">
        <Skeleton className="h-11 w-24 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-full" />
      </div>
      <RowListSkeleton rows={6} />
    </LoadingRegion>
  );
}
