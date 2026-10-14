import type { Metadata } from "next";
import { SegmentNotFound } from "@/components/ui/segment-not-found";

export const metadata: Metadata = { title: "Page not found" };

/** Keeps the admin sidebar on screen for a bad URL or a record that no longer exists. */
export default function AdminNotFound() {
  return <SegmentNotFound homeHref="/admin" homeLabel="the dashboard" />;
}
