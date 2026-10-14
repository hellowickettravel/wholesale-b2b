import type { Metadata } from "next";
import { SegmentNotFound } from "@/components/ui/segment-not-found";

export const metadata: Metadata = { title: "Page not found" };

export default function SupplierNotFound() {
  return <SegmentNotFound homeHref="/supplier" homeLabel="your orders" />;
}
