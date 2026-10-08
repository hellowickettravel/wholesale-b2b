import { ShopShell } from "@/components/shell/shop-shell";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { listShopCategories } from "@/server/shop";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireRole("customer");
  const supabase = await createClient();
  const [{ count }, categories] = await Promise.all([
    supabase.from("basket_items").select("variant_id", { count: "exact", head: true }).eq("customer_id", viewer.customer!.id),
    listShopCategories(viewer.customer!.id),
  ]);
  return (
    <ShopShell businessName={viewer.customer!.businessName} basketCount={count ?? 0} categories={categories}>
      {children}
    </ShopShell>
  );
}
