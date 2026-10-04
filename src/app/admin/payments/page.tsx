import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { DeliveryStatusBadge } from "@/components/shop/order-status";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatShortDate, todayInLondon } from "@/domain/dates";
import { chaseFlags, supplierPayState } from "@/domain/ledger";
import { orderRef, type OrderStatus } from "@/domain/status";
import { cn } from "@/lib/cn";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { owedBySupplierOrder } from "@/server/admin-orders";
import { sendReminder } from "../orders/[id]/actions";
import { ReminderButton } from "../orders/[id]/forms";

export const metadata: Metadata = { title: "Payments & chasing" };

const TABS = {
  chase: "Chase today",
  overdue: "Overdue",
  owed: "All owed to you",
  suppliers: "To pay suppliers",
} as const;
type Tab = keyof typeof TABS;

export default async function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  await requireRole("admin");
  const sp = await searchParams;
  const raw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: Tab = raw && raw in TABS ? (raw as Tab) : "chase";
  const today = todayInLondon();
  const supabase = await createClient();

  const [owing, parts] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("admin_order_summary")
        .select("id, number, status, customer_id, customer_name, total_pence, paid_pence, balance_pence, payment_state, promised_pay_date, next_chase_date, payment_notes")
        .neq("status", "cancelled")
        .gt("balance_pence", 0)
        .order("number")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("admin_supplier_order_summary")
        .select("id, order_id, order_number, supplier_id, supplier_name, customer_name, status, delivered_at, delivery_date, paid_pence, paid_to_supplier")
        .neq("status", "cancelled")
        .eq("paid_to_supplier", false)
        .order("order_number")
        .range(from, to),
    ),
  ]);
  const withFlags = owing.map((o) => ({ ...o, ...chaseFlags({ status: o.status as OrderStatus, balancePence: o.balance_pence ?? 0, promisedPayDate: o.promised_pay_date, nextChaseDate: o.next_chase_date }, today) }));
  const lists = {
    chase: withFlags.filter((o) => o.chaseDue).sort((a, b) => (a.next_chase_date ?? "").localeCompare(b.next_chase_date ?? "")),
    overdue: withFlags.filter((o) => o.overdue).sort((a, b) => (a.promised_pay_date ?? "").localeCompare(b.promised_pay_date ?? "")),
    owed: withFlags,
  };
  const owed = await owedBySupplierOrder(supabase, parts.map((p) => p.id!));
  const supplierRows = parts
    .map((p) => {
      const o = owed.get(p.id!)!;
      return { ...p, owed: o, left: Math.max(0, o.grossPence - (p.paid_pence ?? 0)), state: supplierPayState(o.grossPence, p.paid_pence ?? 0, false) };
    })
    .filter((p) => p.state !== "paid")
    .sort((a, b) => Number(b.status === "delivered") - Number(a.status === "delivered") || (a.order_number ?? 0) - (b.order_number ?? 0));
  const counts: Record<Tab, number> = { chase: lists.chase.length, overdue: lists.overdue.length, owed: lists.owed.length, suppliers: supplierRows.length };
  const orderRows = tab === "suppliers" ? [] : lists[tab];

  return (
    <>
      <PageHeader eyebrow="Payments" title="Payments & chasing" description="Who owes you, who to chase today, and which suppliers are waiting to be paid. Record payments on each order." />
      <nav aria-label="Lists" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link
            key={t}
            href={`/admin/payments?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              tab === t ? "border-primary bg-primary text-primary-ink" : "border-line-strong bg-raised text-ink hover:bg-sunken",
            )}
          >
            {TABS[t]}
            <span className={cn("tabular text-xs", tab === t ? "opacity-80" : "text-ink-subtle")}>{counts[t]}</span>
          </Link>
        ))}
      </nav>

      {tab === "suppliers" ? (
        <Card>
          {supplierRows.length === 0 ? (
            <EmptyState icon={<Wallet />} title="All suppliers are paid">Supplier parts appear here until you mark them paid.</EmptyState>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Supplier</TH>
                  <TH>Order</TH>
                  <TH className="hidden md:table-cell">Delivery</TH>
                  <TH className="text-right">To pay</TH>
                </tr>
              </THead>
              <tbody>
                {supplierRows.map((p) => (
                  <TR key={p.id}>
                    <TD><Link href={`/admin/suppliers/${p.supplier_id}`} className="font-medium hover:text-primary hover:underline">{p.supplier_name}</Link></TD>
                    <TD>
                      <Link href={`/admin/orders/${p.order_id}`} className="block font-semibold hover:text-primary hover:underline">{orderRef(p.order_number!)}</Link>
                      <span className="block text-[13px] text-ink-muted">{p.customer_name}</span>
                      <span className="mt-1 block md:hidden"><DeliveryStatusBadge status={p.status!} /></span>
                    </TD>
                    <TD className="hidden md:table-cell"><DeliveryStatusBadge status={p.status!} /></TD>
                    <TD className="text-right">
                      <Money pence={p.left} className="font-semibold" />
                      {p.owed.costMissing ? <span className="block text-xs text-warning">a line has no cost</span> : null}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : (
        <Card>
          {orderRows.length === 0 ? (
            <EmptyState icon={<Wallet />} title={tab === "chase" ? "Nobody to chase today" : tab === "overdue" ? "Nothing overdue" : "Nothing is owed to you"}>
              {tab === "chase" ? "Set a next chase date on an order and it shows up here on that day." : "Unpaid orders appear here."}
            </EmptyState>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Order</TH>
                  <TH className="hidden md:table-cell">Promised</TH>
                  <TH className="hidden lg:table-cell">Next chase</TH>
                  <TH className="text-right">Owed</TH>
                  <TH className="hidden sm:table-cell"><span className="sr-only">Reminder</span></TH>
                </tr>
              </THead>
              <tbody>
                {orderRows.map((o) => (
                  <TR key={o.id}>
                    <TD>
                      <Link href={`/admin/orders/${o.id}`} className="group block">
                        <span className="flex flex-wrap items-center gap-2 font-semibold group-hover:text-primary group-hover:underline">{orderRef(o.number!)} <PaymentBadge state={o.payment_state} /></span>
                        <span className="block text-[13px] text-ink-muted">{o.customer_name}</span>
                        {o.payment_notes ? <span className="block max-w-md truncate text-[13px] text-ink-subtle">{o.payment_notes}</span> : null}
                      </Link>
                    </TD>
                    <TD className={cn("hidden whitespace-nowrap md:table-cell", o.overdue ? "font-semibold text-danger" : "text-ink-muted")}>{o.promised_pay_date ? formatShortDate(o.promised_pay_date, today) : "—"}</TD>
                    <TD className={cn("hidden whitespace-nowrap lg:table-cell", o.chaseDue ? "font-semibold text-danger" : "text-ink-muted")}>{o.next_chase_date ? formatShortDate(o.next_chase_date, today) : "—"}</TD>
                    <TD className="text-right">
                      <Money pence={o.balance_pence ?? 0} className="font-semibold" />
                      {(o.paid_pence ?? 0) > 0 ? <span className="block text-xs text-ink-muted">of <Money pence={o.total_pence ?? 0} /></span> : null}
                    </TD>
                    <TD className="hidden sm:table-cell"><ReminderButton action={sendReminder.bind(null, o.id!)} /></TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </>
  );
}
