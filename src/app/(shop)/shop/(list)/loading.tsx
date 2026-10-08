import { ChipRowSkeleton, LoadingRegion, ProductGridSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <LoadingRegion label="Loading your catalogue">
      <Skeleton className="h-40 w-full rounded-[var(--radius-xl)] sm:h-44" />
      <div className="mt-5 md:hidden">
        <Skeleton className="h-12 w-full rounded-full" />
        <ChipRowSkeleton className="mt-3" />
      </div>
      <div className="mt-4 flex items-center justify-between border-b border-line pb-4">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-10 w-40 rounded-full" />
      </div>
      <ProductGridSkeleton className="mt-5" count={8} />
    </LoadingRegion>
  );
}
