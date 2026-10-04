import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { OrderStatusBadge } from "@/components/shop/order-status";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, formatShortDate, todayInLondon } from "@/domain/dates";
import { orderProfit } from "@/domain/ledger";
import { orderRef } from "@/domain/status";
import { likePattern } from "@/lib/catalogue/query";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 50;
const TABS = {
  "": { label: "All", statuses: null },
  open: { label: "Open", statuses: ["placed", "sent", "out_for_delivery", "partially_delivered"] },
  delivered: { label: "Delivered", statuses: ["delivered"] },
  completed: { label: "Completed", statuses: ["completed"] },
  cancelled: { label: "Cancelled", statuses: ["cancelled"] },
} as const;
type Tab = keyof typeof TABS;
const PAYMENT = { "": "Any payment", unpaid: "Unpaid", part_paid: "Part paid", paid: "Paid", overpaid: "Overpaid" } as const;
type Pay = keyof typeof PAYMENT;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireRole("admin");
  const sp = await searchParams;
  const tab = (one(sp.status) in TABS ? one(sp.status) : "") as Tab;
  const pay = (one(sp.payment) in PAYMENT ? one(sp.payment) : "") as Pay;
  const supplier = /^[0-9a-f-]{36}$/.test(one(sp.supplier)) ? one(sp.supplier) : "";
  const from = isoDate.test(one(sp.from)) ? one(sp.from) : "";
  const to = isoDate.test(one(sp.to)) ? one(sp.to) : "";
  const q = one(sp.q).trim().slice(0, 100);
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(sp.page), 10) || 1));
  const filters = { status: tab, payment: pay, supplier, from, to, q };
  const href = (over: Partial<typeof filters> & { page?: number }) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, ...over })) if (v && k !== "page") u.set(k, String(v));
    if (over.page && over.page > 1) u.set("page", String(over.page));
    const s = u.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  const supabase = await createClient();
  const build = (t: Tab) => {
    let query = supabase.from("admin_order_summary").select("id, number, status, created_at, delivery_date, customer_id, customer_name, total_pence, paid_pence, balance_pence, payment_state, goods_net_pence, delivery_net_pence, cost_pence, cost_missing, promised_pay_date", { count: "exact" });
    const statuses = TABS[t].statuses;
    if (statuses) query = query.in("status", [...statuses]);
    if (pay) query = query.eq("payment_state", pay);
    if (supplier) query = query.contains("supplier_ids", [supplier]);
    if (from) query = query.gte("created_at", `${from}T00:00:00Z`);
    if (to) query = query.lte("created_at", `${to}T23:59:59Z`);
    const num = /^(?:order-)?(\d{1,9})$/i.exec(q);
    if (num) query = query.eq("number", Number(num[1]));
    else if (q) query = query.ilike("customer_name", likePattern(q));
    return query;
  };
  const [{ data, count }, counts, { data: suppliers }] = await Promise.all([
    build(tab).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    Promise.all((Object.keys(TABS) as Tab[]).map(async (t) => (await build(t).limit(0)).count ?? 0)),
    supabase.from("suppliers").select("id, name").order("name"),
  ]);
  const rows = data ?? [];
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const today = todayInLondon();
  const filtered = Boolean(pay || supplier || from || to || q);

  return (
    <>
      <PageHeader eyebrow="Orders" title="All orders" description="Every order, its payment and its profit. Open one to change it, record payments or see the proof of delivery." />
      <nav aria-label="Filter by status" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {(Object.keys(TABS) as Tab[]).map((t, i) => (
          <Link
            key={t || "all"}
            href={href({ status: t, page: 1 })}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              tab === t ? "border-primary bg-primary text-primary-ink" : "border-line-strong bg-raised text-ink hover:bg-sunken",
            )}
          >
            {TABS[t].label}
            <span className={cn("tabular text-xs", tab === t ? "opacity-80" : "text-ink-subtle")}>{counts[i]}</span>
          </Link>
        ))}
      </nav>

      <form action="/admin/orders" className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto]">
        {tab ? <input type="hidden" name="status" value={tab} /> : null}
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="orders-q" className="sr-only">Order number or restaurant</label>
          <Input id="orders-q" name="q" type="search" defaultValue={q} placeholder="Order number or restaurant" />
        </div>
        <div>
          <label htmlFor="orders-payment" className="sr-only">Payment</label>
          <Select id="orders-payment" name="payment" defaultValue={pay}>
            {(Object.keys(PAYMENT) as Pay[]).map((p) => <option key={p || "any"} value={p}>{PAYMENT[p]}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="orders-supplier" className="sr-only">Supplier</label>
          <Select id="orders-supplier" name="supplier" defaultValue={supplier}>
            <option value="">Any supplier</option>
            {(suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="orders-from" className="sr-only">Placed from</label>
          <Input id="orders-from" name="from" type="date" defaultValue={from} aria-describedby="orders-dates" />
        </div>
        <div>
          <label htmlFor="orders-to" className="sr-only">Placed to</label>
          <Input id="orders-to" name="to" type="date" defaultValue={to} aria-describedby="orders-dates" />
        </div>
        <div className="col-span-2 flex gap-2 lg:col-span-1">
          <button type="submit" className={buttonClasses({ className: "flex-1 lg:flex-none" })}>Filter</button>
          {filtered ? <Link href={href({ payment: "", supplier: "", from: "", to: "", q: "", page: 1 })} className={buttonClasses({ variant: "ghost" })}>Clear</Link> : null}
        </div>
        <p id="orders-dates" className="sr-only">Dates filter by the day the order was placed.</p>
      </form>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={<ClipboardList />} title={filtered || tab ? "No orders match" : "No orders yet"}>
            {filtered || tab ? "Try another filter." : "Orders appear here as soon as a restaurant places one."}
          </EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH className="hidden md:table-cell">Status</TH>
                <TH className="hidden lg:table-cell">Delivery</TH>
                <TH className="text-right">Total</TH>
                <TH className="hidden sm:table-cell">Payment</TH>
                <TH className="hidden text-right xl:table-cell">Profit</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((o) => {
                const profit = o.status === "cancelled" ? null : orderProfit({ goodsNetPence: o.goods_net_pence ?? 0, deliveryNetPence: o.delivery_net_pence ?? 0, costPence: o.cost_pence, costMissing: o.cost_missing ?? false });
                const overdue = o.status !== "cancelled" && (o.balance_pence ?? 0) > 0 && o.promised_pay_date && o.promised_pay_date < today;
                return (
                  <TR key={o.id}>
                    <TD>
                      <Link href={`/admin/orders/${o.id}`} className="group block">
                        <span className="block font-semibold group-hover:text-primary group-hover:underline">{orderRef(o.number!)}</span>
                        <span className="block text-[13px] text-ink-muted">{o.customer_name} · {formatDate(o.created_at!)}</span>
                        <span className="mt-1 flex flex-wrap gap-1 md:hidden"><OrderStatusBadge status={o.status!} /></span>
                      </Link>
                    </TD>
                    <TD className="hidden md:table-cell"><OrderStatusBadge status={o.status!} /></TD>
                    <TD className="hidden whitespace-nowrap text-ink-muted lg:table-cell">{formatShortDate(o.delivery_date!, today)}</TD>
                    <TD className="text-right">
                      <Money pence={o.total_pence ?? 0} />
                      {(o.balance_pence ?? 0) > 0 && o.status !== "cancelled" && (o.paid_pence ?? 0) > 0 ? (
                        <span className="block text-xs text-ink-muted"><Money pence={o.balance_pence!} /> left</span>
                      ) : null}
                    </TD>
                    <TD className="hidden sm:table-cell">
                      <span className="flex flex-wrap items-center gap-1">
                        <PaymentBadge state={o.payment_state} />
                        {overdue ? <span className="text-xs font-semibold text-danger">Overdue</span> : null}
                      </span>
                    </TD>
                    <TD className="hidden text-right xl:table-cell">{profit === null ? <span className="text-ink-muted">—</span> : <Money pence={profit} className={profit < 0 ? "text-danger" : undefined} />}</TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefFor={(n) => href({ page: n })} />
    </>
  );
}
