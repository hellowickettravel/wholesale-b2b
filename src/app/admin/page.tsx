import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const viewer = await requireRole("admin");
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [pending, customers, suppliers, orders] = await Promise.all([
    supabase.from("customers").select("id", head).eq("status", "pending"),
    supabase.from("customers").select("id", head).eq("status", "approved"),
    supabase.from("suppliers").select("id", head).eq("active", true),
    supabase.from("orders").select("id", head),
  ]);
  const firstName = (viewer.fullName || "").split(" ")[0];
  return (
    <>
      <PageHeader eyebrow="Dashboard" title={firstName ? `Hello, ${firstName}` : "Dashboard"} description="Your order desk at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Waiting for approval" value={pending.count ?? 0} tone={pending.count ? "warning" : "neutral"} hint="Registrations to review" />
        <Stat label="Approved customers" value={customers.count ?? 0} />
        <Stat label="Active suppliers" value={suppliers.count ?? 0} />
        <Stat label="Orders" value={orders.count ?? 0} />
      </div>
      <Alert tone="info" className="mt-6" title="More arrives in later phases">
        Money owed, chase lists and the latest orders appear here once ordering is live. You can already{" "}
        <Link href="/admin/users" className="font-semibold text-primary underline-offset-4 hover:underline">
          invite users
        </Link>
        .
      </Alert>
    </>
  );
}
