import { SupplierShell } from "@/components/shell/supplier-shell";
import { requireRole } from "@/server/auth";

export default async function SupplierLayout({ children }: LayoutProps<"/supplier">) {
  const viewer = await requireRole("supplier");
  return <SupplierShell supplierName={viewer.supplier!.name}>{children}</SupplierShell>;
}
