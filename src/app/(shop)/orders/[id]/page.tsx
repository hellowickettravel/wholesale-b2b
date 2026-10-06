import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import { ProofView } from "@/components/delivery/proof-view";
import { BankDetails } from "@/components/shop/bank-details";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
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

  const card = "rounded-[var(--radius-lg)] border border-line bg-raised shadow-rest";

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href="/orders" className="inline-flex min-h-11 items-center gap-1 font-semibold text-ink-muted hover:text-ink hover:underline hover:underline-offset-2">
          <ChevronLeft className="size-4" aria-hidden="true" /> Orders
        </Link>
      </nav>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-5">
        <h1 className="tabular font-sans text-[clamp(1.875rem,1.4rem+2vw,2.5rem)] font-bold leading-[1.1]">{ref}</h1>
        <OrderStatusBadge status={order.status!} />
        <span className="w-full text-ink-muted sm:w-auto">Placed {formatDate(order.created_at!)}</span>
      </div>

      {order.status === "cancelled" ? (
        <Alert tone="danger" className="mb-5" title="This order was cancelled">
          {order.cancel_reason ?? "Nothing will be delivered."}
        </Alert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-5">
          {parts.map((part, i) => (
            <section key={part.id} aria-labelledby={`part-${part.id}`} className={`${card} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-sunken px-4 py-3 sm:px-5">
                <h2 id={`part-${part.id}`} className="font-sans text-base font-bold">
                  {parts.length > 1 ? `Delivery ${i + 1} of ${parts.length}` : "Delivery"}
                  <span className="font-normal text-ink-muted"> on {formatDayDate(order.delivery_date!)}</span>
                </h2>
                <DeliveryStatusBadge status={part.status!} />
              </div>
              <ul className="divide-y divide-line">
                {part.items.map((it) => (
                  <li key={it.id} className="flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0">
                      <p className="font-bold text-ink">{it.product_name}</p>
                      <p className="text-sm font-semibold text-ink-muted">{it.size_label}</p>
                      <p className="tabular text-sm text-ink-muted">
                        {it.qty} × {formatPence(Number(it.unit_price_pence))}
                        {it.vat_rate_bp ? ` + ${formatBp(it.vat_rate_bp)} VAT` : ""}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-lg font-bold">{formatPence(Number(it.line_net_pence))}</span>
                  </li>
                ))}
              </ul>
              {part.proof ? (
                <div className="border-t border-line bg-success-soft px-4 py-4 sm:px-5">
                  <h3 className="mb-3 font-sans text-base font-bold">Proof of delivery</h3>
                  <ProofView proof={part.proof} />
                </div>
              ) : null}
            </section>
          ))}
          {order.note ? (
            <section className={`${card} p-4 sm:p-5`}>
              <h2 className="font-sans text-base font-bold">Your note</h2>
              <p className="mt-1 whitespace-pre-line text-ink-muted">{order.note}</p>
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <section aria-labelledby="totals-heading" className={`${card} p-5`}>
            <h2 id="totals-heading" className="text-xl">Totals</h2>
            <dl className="mt-4 space-y-2.5 text-[0.9375rem]">
              <Row label="Goods (ex VAT)" value={formatPence(Number(order.goods_net_pence))} />
              <Row label="Delivery (ex VAT)" value={Number(order.delivery_net_pence) ? formatPence(Number(order.delivery_net_pence)) : "Free"} />
              <Row label="VAT" value={formatPence(Number(order.vat_pence))} />
              <div className="flex items-baseline justify-between border-t-[1.5px] border-dashed border-line-strong pt-4">
                <dt className="text-lg font-bold">Total</dt>
                <dd className="tabular text-[1.75rem] font-bold leading-none">{formatPence(total)}</dd>
              </div>
            </dl>
            <dl className="mt-5 space-y-2.5 border-t border-line pt-5 text-[0.9375rem]">
              <Row label="Payment" value={PAYMENT_TERMS_LABEL[order.payment_terms!]} />
              <Row label="Status" value={PAID_LABEL[payState] + (paid > 0 && payState === "part_paid" ? ` (${formatPence(paid)})` : "")} />
              {invoice ? <Row label="Invoice" value={`${invoiceRef(Number(invoice.number))}${invoice.voided_at ? " (voided)" : ""}`} /> : null}
              <Row label="Deliver to" value={order.delivery_address ?? ""} />
            </dl>
            {invoice ? (
              <a
                href={`/api/invoices/${invoice.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses({ variant: "secondary", block: true, className: "mt-5" })}
              >
                <Download className="size-4" aria-hidden="true" /> Download invoice (PDF)
              </a>
            ) : null}
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
      <dd className="tabular text-right font-semibold">{value}</dd>
    </div>
  );
}
