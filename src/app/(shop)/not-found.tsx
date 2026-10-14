import type { Metadata } from "next";
import { SegmentNotFound } from "@/components/ui/segment-not-found";

export const metadata: Metadata = { title: "Page not found" };

export default function ShopNotFound() {
  return <SegmentNotFound homeHref="/shop" homeLabel="the shop" />;
}
