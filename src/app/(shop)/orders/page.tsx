import type { Metadata } from "next";
import { Package } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  await requireRole("customer");
  return <ComingSoon title="Orders" icon={<Package />}>Your order history will appear here once ordering opens.</ComingSoon>;
}
