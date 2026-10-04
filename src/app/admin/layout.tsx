import { AdminShell } from "@/components/shell/admin-shell";
import { todayInLondon } from "@/domain/dates";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireRole("admin");
  const supabase = await createClient();
  const [{ count: pending }, { count: chase }] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("admin_order_summary")
      .select("id", { count: "exact", head: true })
      .neq("status", "cancelled")
      .gt("balance_pence", 0)
      .lte("next_chase_date", todayInLondon()),
  ]);
  const badges: Record<string, number> = {};
  if (pending) badges["/admin/approvals"] = pending;
  if (chase) badges["/admin/payments"] = chase;
  return (
    <AdminShell userName={viewer.fullName || viewer.email} badges={badges}>
      {children}
    </AdminShell>
  );
}
