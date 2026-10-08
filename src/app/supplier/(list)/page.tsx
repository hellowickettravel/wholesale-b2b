import type { Metadata } from "next";
import { FilterChips } from "@/components/admin/filter-chips";
import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { DeliveryStatusBadge } from "@/components/shop/order-status";
import { Button } from "@/components/ui/button";
import { EmptyNote } from "@/components/admin/empty-note";
import { PageHeader } from "@/components/ui/page-header";
import { formatDayDate, formatTimestamp } from "@/domain/dates";
import { orderRef } from "@/domain/status";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { markAllRead } from "../orders/[id]/actions";

export const metadata: Metadata = { title: "Orders" };

const TABS = [
  { key: "open", label: "To deliver", statuses: ["placed", "sent", "out_for_delivery"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "all", label: "All", statuses: null },
] as const;

/** Reads only the supplier's own price-free views. */
export default async function SupplierOrders({ searchParams }: PageProps<"/supplier">) {
  const viewer = await requireRole("supplier");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.show) ?? TABS[0];
  const supabase = await createClient();
  let query = supabase
    .from("supplier_order_list")
    .select("id, order_number, status, delivery_date, customer_name, delivery_address, created_at")
    .order("delivery_date", { ascending: tab.key === "open" })
    .order("created_at", { ascending: false })
    .limit(200);
  if (tab.statuses) query = query.in("status", [...tab.statuses]);
  const [{ data: orders }, { data: notes }] = await Promise.all([
    query,
    supabase.from("notifications").select("id, title, body, link, created_at").eq("user_id", viewer.userId).is("read_at", null).order("created_at", { ascending: false }).limit(5),
  ]);

  return (
    <>
      <PageHeader title="Your orders" description="Deliveries assigned to you. Open one to see the items, accept it and send your driver a link." />

      {notes && notes.length ? (
        <section aria-labelledby="notes-heading" className="mb-5 rounded-[var(--radius-lg)] border border-accent/40 bg-accent-soft p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="notes-heading" className="flex items-center gap-2 text-sm font-bold text-ink">
              <Bell className="size-4" aria-hidden="true" /> {notes.length} new {notes.length === 1 ? "update" : "updates"}
            </h2>
            <form action={markAllRead}>
              <Button type="submit" size="sm" variant="ghost" className="text-ink">Mark all read</Button>
            </form>
          </div>
          <ul className="mt-2 space-y-1">
            {notes.map((n) => (
              <li key={n.id}>
                <Link href={n.link ?? "/supplier"} className="block rounded-[var(--radius-md)] px-2 py-1.5 text-sm hover:bg-raised/70">
                  <span className="font-semibold text-ink">{n.title}</span>
                  {n.body ? <span className="text-ink-muted">: {n.body}</span> : null}
                  <span className="block text-xs text-ink-subtle">{formatTimestamp(n.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <FilterChips label="Filter orders" current={tab.key} items={TABS.map((t) => ({ key: t.key, href: t.key === "open" ? "/supplier" : `/supplier?show=${t.key}`, label: t.label }))} />

      {orders && orders.length > 0 ? (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/supplier/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-sunken/60">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="tabular font-semibold text-ink">{orderRef(o.order_number!)}</span>
                    <DeliveryStatusBadge status={o.status!} />
                  </div>
                  <p className="mt-1 truncate text-sm text-ink">
                    <span className="font-medium">{formatDayDate(o.delivery_date!)}</span>, {o.customer_name}
                  </p>
                  <p className="truncate text-[13px] text-ink-muted">{o.delivery_address}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-raised">
          <EmptyNote title={tab.key === "open" ? "Nothing to deliver" : "No orders here yet"}>
            When a restaurant orders something you supply, it appears here and we let you know.
          </EmptyNote>
        </div>
      )}
    </>
  );
}
