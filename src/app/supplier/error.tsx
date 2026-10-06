"use client";

import { SegmentError } from "@/components/ui/segment-error";

/** Keeps the supplier header on screen when a page fails. */
export default function SupplierError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <SegmentError error={error} retry={retry} homeHref="/supplier" homeLabel="your orders" />;
}
