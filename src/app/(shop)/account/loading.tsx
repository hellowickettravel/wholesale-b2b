import { CardSkeleton, LoadingRegion, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <LoadingRegion label="Loading your account" className="mx-auto max-w-2xl lg:mx-0">
      <PageHeaderSkeleton description={false} />
      <Skeleton className="h-24 w-full rounded-[var(--radius-xl)] sm:h-28" />
      <CardSkeleton rows={5} className="mt-5" />
    </LoadingRegion>
  );
}
