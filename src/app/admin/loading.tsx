import { LoadingRegion, PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/spinner";

/** One generic fallback for every admin screen: the title, a filter row and a table. */
export default function Loading() {
  return (
    <LoadingRegion label="Loading">
      <PageHeaderSkeleton action />
      <div className="mb-4 flex flex-wrap gap-2">
        <Skeleton className="h-11 w-full rounded-[var(--radius-md)] sm:w-72" />
        <Skeleton className="h-11 w-28 rounded-[var(--radius-md)]" />
        <Skeleton className="h-11 w-28 rounded-[var(--radius-md)]" />
      </div>
      <TableSkeleton rows={9} cols={6} />
    </LoadingRegion>
  );
}
