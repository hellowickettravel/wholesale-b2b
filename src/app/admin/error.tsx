"use client";

import { SegmentError } from "@/components/ui/segment-error";

/** Keeps the admin sidebar on screen when a page fails. */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <SegmentError error={error} retry={retry} homeHref="/admin" homeLabel="the dashboard" />;
}
