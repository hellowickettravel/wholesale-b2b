import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProofView } from "@/components/delivery/proof-view";
import { BankDetails } from "@/components/shop/bank-details";
import { Alert } from "@/components/ui/alert";
import { DeliveryStatusBadge, OrderStatusBadge } from "@/components/shop/order-status";
import { formatDate, formatDayDate } from "@/domain/dates";
import { formatBp, formatPence } from "@/domain/money";
import { invoiceRef, orderRef, PAYMENT_TERMS_LABEL, paymentStatus } from "@/domain/status";
import { requireRole } from "@/server/auth";
import { getBankSettings, getCustomerOrder } from "@/server/customer-orders";

export async function generateMetadata({ params }: PageProps<"/orders/[id]">): Promise<Metadata> {
  await requireRole("customer");
  const found = await getCustomerOrder((await params).id);
  return { title: found ? orderRef(found.order.number!) : "Order not found" };
}

const PAID_LABEL = { unpaid: "Not paid yet", part_paid: "Part paid", paid: "Paid", overpaid: "Paid" } as const;

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  await requireRole("customer");
  const { id } = await params;
  const [found, bank] = await Promise.all([getCustomerOrder(id), getBankSettings()]);
  if (!found) notFound();
  const { order, parts, invoice, payments } = found;
  const ref = orderRef(order.number!);
  const total = Number(order.total_pence);
  const paid = payments.reduce((a, p) => a + Number(p.amount_pence), 0);
  const payState = paymentStatus(total, paid);

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link href="/orders" className="hover:text-ink">Orders</Link>
      </nav>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 pb-5">
        <h1 className="tabular text-2xl font-bold sm:text-[28px]">{ref}</h1>
        <OrderStatusBadge status={order.status!} />
        <span className="w-full text-sm text-ink-muted sm:w-auto">Placed {formatDate(order.created_at!)}</span>
      </div>

      {order.status === "cancelled" ? (
        <Alert tone="danger" className="mb-5" title="This order was cancelled">
          {order.cancel_reason ?? "Nothing will be delivered."}
        </Alert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          {parts.map((part, i) => (
            <section key={part.id} aria-labelledby={`part-${part.id}`} className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken/50 px-4 py-3">
                <h2 id={`part-${part.id}`} className="text-sm font-bold">
                  {parts.length > 1 ? `Delivery ${i + 1} of ${parts.length}` : "Delivery"}
                  <span className="font-normal text-ink-muted"> · {formatDayDate(order.delivery_date!)}</span>
                </h2>
                <DeliveryStatusBadge status={part.status!} />
              </div>
              <ul className="divide-y divide-line">
                {part.items.map((it) => (
                  <li key={it.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{it.product_name}</p>
                      <p className="tabular text-[13px] text-ink-muted">
                        {it.size_label} · {it.qty} × {formatPence(Number(it.unit_price_pence))}
                        {it.vat_rate_bp ? ` + ${formatBp(it.vat_rate_bp)} VAT` : ""}
                      </p>
                    </div>
                    <span className="tabular shrink-0 font-semibold">{formatPence(Number(it.line_net_pence))}</span>
                  </li>
                ))}
              </ul>
              {part.proof ? (
                <div className="border-t border-line bg-success-soft/30 px-4 py-3">
                  <h3 className="mb-2 text-sm font-bold">Proof of delivery</h3>
                  <ProofView proof={part.proof} />
                </div>
              ) : null}
            </section>
          ))}
          {order.note ? (
            <section className="rounded-[var(--radius-lg)] border border-line bg-raised p-4 text-sm">
              <h2 className="font-bold">Your note</h2>
              <p className="mt-1 whitespace-pre-line text-ink-muted">{order.note}</p>
            </section>
          ) : null}
        </div>

        <div className="space-y-4">
          <section aria-labelledby="totals-heading" className="rounded-[var(--radius-lg)] border border-line bg-raised p-4 sm:p-5">
            <h2 id="totals-heading" className="text-base font-bold">Totals</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Goods (ex VAT)" value={formatPence(Number(order.goods_net_pence))} />
              <Row label="Delivery (ex VAT)" value={Number(order.delivery_net_pence) ? formatPence(Number(order.delivery_net_pence)) : "Free"} />
              <Row label="VAT" value={formatPence(Number(order.vat_pence))} />
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="font-bold">Total</dt>
                <dd className="tabular text-xl font-extrabold">{formatPence(total)}</dd>
              </div>
            </dl>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <Row label="Payment" value={PAYMENT_TERMS_LABEL[order.payment_terms!]} />
              <Row label="Status" value={PAID_LABEL[payState] + (paid > 0 && payState === "part_paid" ? ` (${formatPence(paid)})` : "")} />
              {invoice ? <Row label="Invoice" value={`${invoiceRef(Number(invoice.number))}${invoice.voided_at ? " (voided)" : ""}`} /> : null}
              <Row label="Deliver to" value={order.delivery_address ?? ""} />
            </dl>
          </section>
          {order.status !== "cancelled" && (payState === "unpaid" || payState === "part_paid") ? (
            <BankDetails bank={bank} reference={ref} amountPence={total - paid} payBy={order.promised_pay_date} />
          ) : null}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="tabular text-right font-medium">{value}</dd>
    </div>
  );
}
