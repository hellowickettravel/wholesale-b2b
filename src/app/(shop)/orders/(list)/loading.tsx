import { CardListSkeleton, LoadingRegion, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Loading your orders">
      <PageHeaderSkeleton />
      <CardListSkeleton rows={5} />
    </LoadingRegion>
  );
}
