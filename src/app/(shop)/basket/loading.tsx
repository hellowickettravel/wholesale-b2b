import { BasketSkeleton, LoadingRegion, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Loading your basket">
      <PageHeaderSkeleton description={false} />
      <BasketSkeleton />
    </LoadingRegion>
  );
}
