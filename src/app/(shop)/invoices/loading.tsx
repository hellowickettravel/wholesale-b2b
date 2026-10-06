import { CardListSkeleton, LoadingRegion, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Loading your invoices">
      <PageHeaderSkeleton />
      <CardListSkeleton rows={4} />
    </LoadingRegion>
  );
}
