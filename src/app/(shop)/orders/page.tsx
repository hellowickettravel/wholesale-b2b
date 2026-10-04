import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { OrderStatusBadge } from "@/components/shop/order-status";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, formatDayDate } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import { orderRef } from "@/domain/status";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Orders" };
const PAGE_SIZE = 20;

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const viewer = await requireRole("customer");
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
      <PageHeader eyebrow={viewer.customer!.businessName} title="Orders" />
      {orders.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-raised">
          <EmptyState icon={<Package />} title={page > 1 ? "No more orders" : "No orders yet"} action={<LinkButton href="/shop">Browse your catalogue</LinkButton>}>
            Your orders and their delivery progress will show here.
          </EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-sunken/60">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="tabular font-semibold text-ink">{orderRef(o.number!)}</span>
                    <OrderStatusBadge status={o.status!} />
                  </div>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    Placed {formatDate(o.created_at!)} · delivery {formatDayDate(o.delivery_date!)}
                  </p>
                </div>
                <span className="tabular shrink-0 font-semibold text-ink">{formatPence(Number(o.total_pence))}</span>
                <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefFor={(p) => (p > 1 ? `/orders?page=${p}` : "/orders")} />
    </>
  );
}
