import type { Metadata } from "next";
import { PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDayDate } from "@/domain/dates";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Orders" };

const STATUS: Record<string, string> = {
  placed: "New",
  sent: "New",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Reads only the supplier_order_list view: the supplier's own orders, with no prices at all. */
export default async function SupplierOrders() {
  await requireRole("supplier");
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("supplier_order_list")
    .select("id, order_number, status, delivery_date, customer_name, delivery_address")
    .order("delivery_date", { ascending: true })
    .limit(200);

  return (
    <>
      <PageHeader title="Your orders" description="Deliveries assigned to you. Order details and driver links arrive in the next phase." />
      <Card>
        {orders && orders.length > 0 ? (
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH className="hidden sm:table-cell">Deliver</TH>
                <TH>Restaurant</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <tbody>
              {orders.map((o) => (
                <TR key={o.id}>
                  <TD className="whitespace-nowrap">
                    <div className="font-semibold tabular">#{o.order_number}</div>
                    <div className="text-[13px] text-ink-muted sm:hidden">{o.delivery_date ? formatDayDate(o.delivery_date) : "—"}</div>
                  </TD>
                  <TD className="hidden whitespace-nowrap sm:table-cell">{o.delivery_date ? formatDayDate(o.delivery_date) : "—"}</TD>
                  <TD className="min-w-0">
                    <div className="font-medium">{o.customer_name}</div>
                    <div className="max-w-[9rem] truncate text-[13px] text-ink-muted sm:max-w-xs">{o.delivery_address}</div>
                  </TD>
                  <TD>
                    <Badge tone={o.status === "delivered" ? "success" : o.status === "cancelled" ? "neutral" : "accent"} dot>
                      {STATUS[o.status ?? "placed"]}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<PackageOpen />} title="No orders yet">
            When a restaurant orders something you supply, it appears here.
          </EmptyState>
        )}
      </Card>
    </>
  );
}
