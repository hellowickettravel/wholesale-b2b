import type { Metadata } from "next";
import { ShopTitle } from "@/components/shop/page-title";
import { PlateMessage } from "@/components/shop/plate-message";
import { LinkButton } from "@/components/ui/button";
import { deliveryDateOptions, todayInLondon } from "@/domain/dates";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { basketView, getShopSettings } from "@/server/shop";
import { BasketCheckout } from "./basket-checkout";

export const metadata: Metadata = { title: "Basket" };

export default async function BasketPage() {
  const viewer = await requireRole("customer");
  const customerId = viewer.customer!.id;
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("basket_items")
    .select("variant_id, qty")
    .eq("customer_id", customerId)
    .order("created_at");
  if (error) throw new Error(`basket: ${error.message}`);
  const [lines, settings] = await Promise.all([basketView(customerId, rows ?? []), getShopSettings(customerId)]);
  const today = todayInLondon();

  return (
    <>
      <ShopTitle>Basket</ShopTitle>
      {lines.length === 0 ? (
        <PlateMessage title="Your basket is empty" action={<LinkButton href="/shop">Browse your catalogue</LinkButton>}>
          Add items from your catalogue. Your basket is kept for your whole team, on any device.
        </PlateMessage>
      ) : (
        <BasketCheckout
          lines={lines}
          delivery={settings.delivery}
          deliveryDates={deliveryDateOptions(today, settings.deliveryDays)}
          today={today}
        />
      )}
    </>
  );
}
