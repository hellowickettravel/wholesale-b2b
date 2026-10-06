import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { OrderStatusBadge } from "@/components/shop/order-status";
import { ShopTitle } from "@/components/shop/page-title";
import { PlateMessage } from "@/components/shop/plate-message";
import { LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, formatDayDate } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import { orderRef } from "@/domain/status";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Orders" };
const PAGE_SIZE = 20;

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  await requireRole("customer");
  const sp = await searchParams;
  const n = Number.parseInt(String(sp.page ?? "1"), 10);
  const page = Number.isFinite(n) && n >= 1 && n <= 1000 ? n : 1;
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("customer_orders")
    .select("id, number, status, delivery_date, total_pence, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error && error.code !== "PGRST103") throw new Error(`orders: ${error.message}`);
  const orders = data ?? [];
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <ShopTitle description={orders.length > 0 ? "Every order you have placed, newest first." : undefined}>Orders</ShopTitle>
      {orders.length === 0 ? (
        <PlateMessage title={page > 1 ? "No more orders" : "No orders yet"} action={<LinkButton href="/shop">Browse your catalogue</LinkButton>}>
          Your orders and their delivery progress will show here.
        </PlateMessage>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-[var(--radius-lg)] border border-line bg-raised px-4 py-4 shadow-rest transition-[box-shadow,transform] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:shadow-lift motion-safe:hover:-translate-y-0.5 sm:px-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="tabular text-lg font-bold text-ink">{orderRef(o.number!)}</span>
                  <OrderStatusBadge status={o.status!} />
                </div>
                <span className="tabular text-xl font-bold text-ink md:order-4">{formatPence(Number(o.total_pence))}</span>
                <p className="col-span-2 flex gap-x-8 text-sm text-ink-muted md:contents">
                  <span className="md:order-2">
                    <span className="block">Placed</span>
                    <span className="block font-semibold text-ink">{formatDate(o.created_at!)}</span>
                  </span>
                  <span className="md:order-3">
                    <span className="block">Delivery</span>
                    <span className="block font-semibold text-ink">{formatDayDate(o.delivery_date!)}</span>
                  </span>
                </p>
                <ChevronRight className="hidden size-5 text-ink-subtle transition-transform group-hover:translate-x-0.5 md:order-5 md:block" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefFor={(p) => (p > 1 ? `/orders?page=${p}` : "/orders")} />
    </>
  );
}
