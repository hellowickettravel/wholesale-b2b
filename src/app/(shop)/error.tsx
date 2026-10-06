"use client";

import { SegmentError } from "@/components/ui/segment-error";

/** Keeps the shop navigation on screen when a page in the restaurant area fails. */
export default function ShopError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <SegmentError error={error} retry={retry} homeHref="/shop" homeLabel="your catalogue" />;
}
