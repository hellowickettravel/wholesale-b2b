import { AdminShell } from "@/components/shell/admin-shell";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireRole("admin");
  const supabase = await createClient();
  const { count } = await supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "pending");
  return (
    <AdminShell userName={viewer.fullName || viewer.email} badges={count ? { "/admin/approvals": count } : {}}>
      {children}
    </AdminShell>
  );
}
