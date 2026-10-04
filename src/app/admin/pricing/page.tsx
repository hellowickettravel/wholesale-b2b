import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth";

/** Prices are set per restaurant: the sidebar's Pricing entry opens the approved customers. */
export default async function PricingIndex() {
  await requireRole("admin");
  redirect("/admin/customers?status=approved");
}
