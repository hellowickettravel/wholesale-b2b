import { ShopShell } from "@/components/shell/shop-shell";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireRole("customer");
  const supabase = await createClient();
  const { count } = await supabase
    .from("basket_items")
    .select("variant_id", { count: "exact", head: true })
    .eq("customer_id", viewer.customer!.id);
  return (
    <ShopShell businessName={viewer.customer!.businessName} basketCount={count ?? 0}>
      {children}
    </ShopShell>
  );
}
