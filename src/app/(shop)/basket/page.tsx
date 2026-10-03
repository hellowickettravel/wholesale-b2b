import type { Metadata } from "next";
import { ShoppingBasket } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Basket" };

export default async function BasketPage() {
  await requireRole("customer");
  return <ComingSoon title="Basket" icon={<ShoppingBasket />}>Your basket, with live VAT and the delivery charge, arrives with ordering.</ComingSoon>;
}
