import { ShopShell } from "@/components/shell/shop-shell";
import { requireRole } from "@/server/auth";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireRole("customer");
  return <ShopShell businessName={viewer.customer!.businessName}>{children}</ShopShell>;
}
