import { ChipRowSkeleton, LoadingRegion, PageHeaderSkeleton, ShopListSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <LoadingRegion label="Loading your catalogue">
      <PageHeaderSkeleton />
      <div className="lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-x-6">
        <div className="py-2.5 lg:contents">
          <Skeleton className="h-11 w-full rounded-full lg:col-start-2 lg:row-start-1 lg:max-w-lg" />
          <div className="mt-2 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0">
            <ChipRowSkeleton className="lg:hidden" />
            <div className="hidden space-y-1 lg:block">
              {Array.from({ length: 12 }, (_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-[var(--radius-md)]" />
              ))}
            </div>
          </div>
        </div>
        <div className="min-w-0 pt-4 lg:col-start-2 lg:row-start-2 lg:pt-1">
          <div className="pb-3">
            <Skeleton className="h-5 w-44" />
          </div>
          <ShopListSkeleton rows={8} />
        </div>
      </div>
    </LoadingRegion>
  );
}
