import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BellRing } from "lucide-react";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { OrderStatusBadge } from "@/components/shop/order-status";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { formatShortDate, formatTimestamp } from "@/domain/dates";
import { orderRef } from "@/domain/status";
import { requireRole } from "@/server/auth";
import { getDashboard } from "@/server/admin-orders";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const viewer = await requireRole("admin");
  const d = await getDashboard();
  const firstName = (viewer.fullName || "").split(" ")[0];
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "Europe/London" }).format(new Date(`${d.today}T12:00:00Z`));

  return (
    <>
      <PageHeader eyebrow="Dashboard" title={firstName ? `Hello, ${firstName}` : "Dashboard"} description="Money in, money out, and what needs you today." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Owed to you"
          value={<Money pence={d.owedToYou} />}
          tone={d.overdue ? "danger" : d.owedToYou ? "warning" : "success"}
          hint={d.unpaidOrders ? `${d.unpaidOrders} unpaid order${d.unpaidOrders === 1 ? "" : "s"}${d.overdue ? `, ${d.overdue} overdue` : ""}` : "Everything is paid"}
        />
        <Stat
          label="Owed to suppliers"
          value={<Money pence={d.dueSuppliers} />}
          tone={d.dueSuppliers ? "warning" : "neutral"}
          hint={<>For delivered orders{d.laterSuppliers ? <>; <Money pence={d.laterSuppliers} /> more once the rest arrive</> : null}{d.supplierCostMissing ? ". Some lines have no cost" : ""}</>}
        />
        <Stat label="Chase today" value={d.chase.length} tone={d.chase.length ? "danger" : "neutral"} hint={<Link href="/admin/payments" className="font-semibold text-primary hover:underline">Payments &amp; chasing</Link>} />
        <Stat
          label="Waiting for approval"
          value={d.pendingApprovals}
          tone={d.pendingApprovals ? "warning" : "neutral"}
          hint={d.pendingApprovals ? <Link href="/admin/approvals" className="font-semibold text-primary hover:underline">Review registrations</Link> : "Registrations to review"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="self-start">
          <CardHeader title="Latest orders" action={<LinkButton href="/admin/orders" size="sm" variant="ghost" icon={<ArrowRight className="size-4" aria-hidden="true" />}>All orders</LinkButton>} />
          {d.latest.length === 0 ? (
            <EmptyState title="No orders yet">Orders appear here as soon as a restaurant places one.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {d.latest.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 hover:bg-sunken">
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{orderRef(o.number!)} · {o.customer_name}</span>
                      <span className="block text-[13px] text-ink-muted">{formatTimestamp(o.created_at!)} · delivery {formatShortDate(o.delivery_date!, d.today)}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <OrderStatusBadge status={o.status!} />
                      <PaymentBadge state={o.payment_state} />
                      <Money pence={o.total_pence ?? 0} className="font-semibold" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Chase today" description="Money still owed and the chase date has come." />
            {d.chase.length === 0 ? (
              <CardBody><p className="text-sm text-ink-muted">Nobody to chase today.</p></CardBody>
            ) : (
              <ul className="divide-y divide-line">
                {d.chase.slice(0, 8).map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sunken">
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-semibold text-ink"><BellRing className="size-3.5 text-danger" aria-hidden="true" />{orderRef(o.number!)}</span>
                        <span className="block truncate text-[13px] text-ink-muted">{o.customer_name}</span>
                      </span>
                      <Money pence={o.balance_pence ?? 0} className="font-semibold" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title={`This month (${monthName})`} description="Orders placed, not cancelled. Ex VAT." />
            <CardBody>
              <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                <dt className="text-ink-muted">Orders</dt><dd className="tabular text-right font-semibold">{d.month.orders}</dd>
                <dt className="text-ink-muted">Sales</dt><dd className="text-right font-semibold"><Money pence={d.month.salesNetPence} /></dd>
                <dt className="text-ink-muted">Profit</dt>
                <dd className="text-right font-semibold"><Money pence={d.month.profitPence} />{d.month.profitKnown ? null : <span className="block text-xs font-normal text-warning">some lines have no cost</span>}</dd>
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
