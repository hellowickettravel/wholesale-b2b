import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Lock, Phone } from "lucide-react";
import { PaymentBadge, SupplierPayBadge } from "@/components/admin/payment-badge";
import { DriverLinkCard, ProofUpload } from "@/components/delivery/driver-link";
import { ProofView } from "@/components/delivery/proof-view";
import { DeliveryStatusBadge, OrderStatusBadge } from "@/components/shop/order-status";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Stat } from "@/components/ui/stat";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, formatDayDate, formatShortDate, formatTimestamp } from "@/domain/dates";
import { marginOnRevenueBp } from "@/domain/totals";
import { formatBp } from "@/domain/money";
import { invoiceRef, isOrderLocked, orderRef, PAYMENT_TERMS_LABEL } from "@/domain/status";
import { PAYMENT_METHOD_LABEL } from "@/lib/validation/admin-orders";
import { requireRole } from "@/server/auth";
import { getAdminOrder } from "@/server/admin-orders";
import {
  adminDriverLink,
  adminUploadProof,
  cancelOrder,
  completeOrder,
  editOrder,
  recordCustomerPayment,
  recordSupplierPayment,
  saveChase,
  sendReminder,
  setSupplierPaid,
} from "./actions";
import { CancelOrder, ChaseForm, CompleteButton, PaymentForm, ReminderButton, SupplierPaidToggle } from "./forms";
import { OrderEditor } from "./order-editor";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireRole("admin");
  const { id } = await params;
  const d = await getAdminOrder(id);
  if (!d) notFound();
  const { order, customer } = d;
  const ref = orderRef(order.number);
  const locked = isOrderLocked(order, d.parts.map((p) => p.status));
  const liveParts = d.parts.filter((p) => p.lines.length > 0 || p.status !== "cancelled");
  const revenue = order.goods_net_pence + order.delivery_net_pence;
  const marginBp = d.profitPence === null ? null : marginOnRevenueBp(d.profitPence, revenue);
  const unpaidSuppliers = d.parts.filter((p) => p.status !== "cancelled" && p.payState !== "paid").length;
  const completeWarning =
    d.balancePence > 0 || unpaidSuppliers
      ? [d.balancePence > 0 ? "The restaurant has not paid in full." : "", unpaidSuppliers ? "Not every supplier is marked paid." : ""].filter(Boolean).join(" ")
      : null;

  return (
    <>
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Orders
      </Link>
      <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-ink">{ref}</h1>
            <OrderStatusBadge status={order.status} />
            <PaymentBadge state={d.paymentState} />
          </div>
          <p className="mt-1 text-[15px] text-ink-muted">
            <Link href={`/admin/customers/${customer.id}`} className="font-semibold text-ink hover:underline">{customer.business_name}</Link>
            {", placed "}{formatTimestamp(order.created_at)}{", delivery "}{formatDayDate(order.delivery_date)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-start gap-2">
          {d.invoice ? (
            <a href={`/api/invoices/${d.invoice.id}/pdf`} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <FileText className="size-4" aria-hidden="true" /> Invoice PDF
            </a>
          ) : null}
          {order.status === "delivered" ? <CompleteButton action={completeOrder.bind(null, order.id)} warning={completeWarning} /> : null}
          {!locked ? <CancelOrder action={cancelOrder.bind(null, order.id)} reference={ref} /> : null}
        </div>
      </div>

      {order.status === "cancelled" ? (
        <Alert tone="danger" className="mb-6" title="Cancelled">
          {order.cancelled_at ? `${formatTimestamp(order.cancelled_at)}. ` : ""}{order.cancel_reason ?? ""}
          {d.paidPence > 0 ? " Money was received on this order: record a refund below once it is paid back." : ""}
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Order total (inc VAT)" value={<Money pence={order.total_pence} />} hint={d.invoice ? `${invoiceRef(d.invoice.number)}${d.invoice.voided_at ? " (voided)" : ""}` : undefined} />
        <Stat label="Paid by the restaurant" value={<Money pence={d.paidPence} />} tone={d.paymentState === "paid" ? "success" : "neutral"} />
        <Stat
          label={d.balancePence < 0 ? "To refund" : "Still owed"}
          value={<Money pence={Math.abs(d.balancePence)} />}
          tone={d.balancePence > 0 ? (d.flags.overdue ? "danger" : "warning") : d.balancePence < 0 ? "danger" : "success"}
          hint={d.flags.overdue ? "Overdue: past the promised date" : order.promised_pay_date ? `Promised by ${formatShortDate(order.promised_pay_date, d.today)}` : undefined}
        />
        <Stat
          label="Profit (ex VAT)"
          value={d.profitPence === null ? "—" : <Money pence={d.profitPence} />}
          tone={d.profitPence !== null && d.profitPence < 0 ? "danger" : "neutral"}
          hint={d.profitPence === null ? "A line has no cost recorded" : marginBp === null ? undefined : `${formatBp(marginBp)} of sales`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {liveParts.map((p, i) => (
            <Card key={p.id} data-testid={`part-${p.supplier_name}`}>
              <CardHeader
                title={<span className="flex flex-wrap items-center gap-2">Delivery {i + 1} of {liveParts.length}: {p.supplier_name} <DeliveryStatusBadge status={p.status} /></span>}
                description={p.delivered_at ? `Delivered ${formatTimestamp(p.delivered_at)}` : `For ${formatDayDate(order.delivery_date)}`}
                action={p.status !== "cancelled" ? <SupplierPayBadge state={p.payState} /> : null}
              />
              {p.lines.length ? (
                <Table>
                  <THead>
                    <tr>
                      <TH>Item</TH>
                      <TH className="text-right">Qty</TH>
                      <TH className="text-right">Price</TH>
                      <TH className="hidden text-right sm:table-cell">Cost</TH>
                      <TH className="text-right">Line</TH>
                      <TH className="hidden text-right md:table-cell">VAT</TH>
                    </tr>
                  </THead>
                  <tbody>
                    {p.lines.map((l) => (
                      <TR key={l.id}>
                        <TD>
                          <span className="font-medium text-ink">{l.product_name}</span>
                          <span className="block text-xs text-ink-muted">{l.size_label}</span>
                        </TD>
                        <TD className="text-right tabular">{l.qty}</TD>
                        <TD className="text-right"><Money pence={l.unit_price_pence} /></TD>
                        <TD className="hidden text-right sm:table-cell">{l.unit_cost_pence === null ? <Badge tone="warning">none</Badge> : <Money pence={l.unit_cost_pence} muted />}</TD>
                        <TD className="text-right"><Money pence={l.line_net_pence} /></TD>
                        <TD className="hidden text-right text-ink-muted md:table-cell">{formatBp(l.vat_rate_bp)}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <CardBody><p className="text-sm text-ink-muted">Nothing left for this supplier on the order.</p></CardBody>
              )}

              {p.status !== "cancelled" ? (
                <CardBody className="grid gap-6 border-t border-line lg:grid-cols-2">
                  <section aria-label={`Paying ${p.supplier_name}`} className="space-y-3">
                    <h3 className="text-sm font-semibold text-ink">Paying {p.supplier_name}</h3>
                    <dl className="grid grid-cols-2 gap-y-1 text-sm">
                      <dt className="text-ink-muted">Owed (cost + VAT)</dt>
                      <dd className="text-right"><Money pence={p.owed.grossPence} />{p.owed.costMissing ? <span className="block text-xs text-warning">a line has no cost</span> : null}</dd>
                      <dt className="text-ink-muted">Paid</dt>
                      <dd className="text-right"><Money pence={p.paid_pence ?? 0} /></dd>
                    </dl>
                    {p.payments.length ? (
                      <ul className="space-y-1 text-[13px] text-ink-muted">
                        {p.payments.map((sp) => (
                          <li key={sp.id}><Money pence={sp.amount_pence} /> on {formatDate(sp.paid_on)}, {PAYMENT_METHOD_LABEL[sp.method]}{sp.reference ? `, ${sp.reference}` : ""}</li>
                        ))}
                      </ul>
                    ) : null}
                    <SupplierPaidToggle action={setSupplierPaid.bind(null, p.id)} paid={p.paid_to_supplier ?? false} />
                    <details className="rounded-[var(--radius-md)] border border-line">
                      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-primary">Record a payment to {p.supplier_name}</summary>
                      <div className="border-t border-line p-3">
                        <PaymentForm
                          action={recordSupplierPayment.bind(null, p.id)}
                          today={d.today}
                          suggested={Math.max(0, p.owed.grossPence - (p.paid_pence ?? 0)) ? ((Math.max(0, p.owed.grossPence - (p.paid_pence ?? 0))) / 100).toFixed(2) : undefined}
                          submitLabel="Record supplier payment"
                        />
                      </div>
                    </details>
                  </section>
                  <section aria-label={`Delivery proof from ${p.supplier_name}`} className="space-y-3">
                    <h3 className="text-sm font-semibold text-ink">Proof of delivery</h3>
                    {p.proof ? <ProofView proof={p.proof} /> : null}
                    {p.status !== "delivered" ? (
                      <DriverLinkCard
                        makeLink={adminDriverLink.bind(null, p.id)}
                        customerName={customer.business_name}
                        active={p.activeLink ? { createdAt: p.activeLink.created_at, expiresAt: p.activeLink.expires_at! } : null}
                      />
                    ) : null}
                    <ProofUpload
                      upload={adminUploadProof.bind(null, p.id)}
                      title={p.status === "delivered" ? "Add a better proof" : "Upload the proof yourself"}
                      submitLabel={p.status === "delivered" ? "Save proof" : "Save proof and mark delivered"}
                    />
                  </section>
                </CardBody>
              ) : null}
            </Card>
          ))}

          {d.removed.length ? (
            <Card>
              <CardHeader title="Taken off the order" />
              <CardBody>
                <ul className="space-y-1 text-sm text-ink-muted">
                  {d.removed.map((l) => (
                    <li key={l.id}><span className="line-through">{l.product_name} {l.size_label} × {l.qty}</span>, {formatTimestamp(l.removed_at!)}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Change the order"
              description={locked ? undefined : "Quantities, taking a line off (quantity 0), moving a line to another supplier, delivery charge."}
            />
            <CardBody>
              {locked ? (
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                  <Lock className="size-4" aria-hidden="true" />
                  {order.status === "cancelled" || order.status === "completed"
                    ? `This order is ${order.status}. It can no longer be changed.`
                    : "A delivery has been made, so the order can no longer be changed."}
                </p>
              ) : (
                <OrderEditor
                  action={editOrder.bind(null, order.id)}
                  expectedUpdatedAt={order.updated_at}
                  currentTotalPence={order.total_pence}
                  suppliers={d.suppliers}
                  delivery={{
                    chargePence: order.delivery_net_pence,
                    vatMode: d.settings.delivery_vat_mode,
                    fixedVatBp: d.settings.delivery_fixed_vat_bp,
                    minOrderPence: d.settings.min_order_pence,
                    usualChargePence: d.settings.delivery_charge_pence,
                  }}
                  lines={d.lines.map((l) => ({
                    id: l.id,
                    productName: l.product_name,
                    sizeLabel: l.size_label,
                    qty: l.qty,
                    unitPricePence: l.unit_price_pence,
                    unitCostPence: l.unit_cost_pence,
                    vatRateBp: l.vat_rate_bp,
                    supplierId: l.supplier_id,
                  }))}
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Timeline" description="Every change to this order, newest first." />
            <CardBody>
              {d.timeline.length ? (
                <ol className="relative space-y-4 border-l border-line pl-5">
                  {d.timeline.map((t) => (
                    <li key={t.id} className="relative">
                      <span aria-hidden="true" className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-raised bg-primary" />
                      <p className="text-sm text-ink">{t.text}</p>
                      <p className="text-xs text-ink-muted">{formatTimestamp(t.at)}, {t.who}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink-muted">No changes yet.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Restaurant" />
            <CardBody className="space-y-2 text-sm">
              <p className="font-semibold text-ink">{customer.business_name}</p>
              {customer.contact_name ? <p className="text-ink-muted">{customer.contact_name}</p> : null}
              {customer.phone ? (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="size-4" aria-hidden="true" />{customer.phone}</a>
              ) : null}
              {customer.email ? <p className="break-all text-ink-muted">{customer.email}</p> : null}
              <p className="text-ink-muted">{order.delivery_address}</p>
              {order.note ? <p className="rounded-[var(--radius-md)] bg-sunken px-3 py-2 text-ink">“{order.note}”</p> : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Totals" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                <dt className="text-ink-muted">Goods (ex VAT)</dt><dd className="text-right"><Money pence={order.goods_net_pence} /></dd>
                <dt className="text-ink-muted">Delivery (ex VAT)</dt><dd className="text-right"><Money pence={order.delivery_net_pence} /></dd>
                <dt className="text-ink-muted">VAT</dt><dd className="text-right"><Money pence={order.vat_pence} /></dd>
                <dt className="font-semibold text-ink">Total</dt><dd className="text-right font-semibold"><Money pence={order.total_pence} /></dd>
                <dt className="text-ink-muted">Cost of goods</dt><dd className="text-right">{d.costMissing || d.costPence === null ? "—" : <Money pence={d.costPence} muted />}</dd>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Payment from the restaurant" description={PAYMENT_TERMS_LABEL[order.payment_terms]} action={<PaymentBadge state={d.paymentState} />} />
            <CardBody className="space-y-4">
              {d.flags.chaseDue || d.flags.overdue ? (
                <Alert tone={d.flags.overdue ? "danger" : "warning"}>
                  {d.flags.overdue ? "Overdue: the promised date has passed." : "Due a chase today."}
                </Alert>
              ) : null}
              {d.payments.length ? (
                <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line text-sm">
                  {d.payments.map((pm) => (
                    <li key={pm.id} className="flex items-start justify-between gap-3 px-3 py-2">
                      <span className="min-w-0">
                        <span className="block text-ink">{formatDate(pm.paid_on)}, {PAYMENT_METHOD_LABEL[pm.method]}</span>
                        {pm.reference ? <span className="block break-all text-xs text-ink-muted">Ref {pm.reference}</span> : null}
                      </span>
                      <Money pence={pm.amount_pence} className={pm.amount_pence < 0 ? "text-danger" : "font-semibold"} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">No payments recorded yet. The restaurant pays by bank transfer with the reference <span className="font-semibold text-ink">{ref}</span>.</p>
              )}
              <details className="rounded-[var(--radius-md)] border border-line" open={d.payments.length === 0 && d.balancePence > 0 && order.status !== "cancelled"}>
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-primary">Record a payment</summary>
                <div className="border-t border-line p-3">
                  <PaymentForm
                    action={recordCustomerPayment.bind(null, order.id)}
                    today={d.today}
                    suggested={d.balancePence > 0 ? (d.balancePence / 100).toFixed(2) : undefined}
                    allowRefund
                    submitLabel="Record payment"
                  />
                </div>
              </details>
              {d.balancePence > 0 && order.status !== "cancelled" ? <ReminderButton action={sendReminder.bind(null, order.id)} /> : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Chasing" />
            <CardBody>
              <ChaseForm
                action={saveChase.bind(null, order.id)}
                initial={{ promised_pay_date: order.promised_pay_date ?? "", next_chase_date: order.next_chase_date ?? "", payment_notes: order.payment_notes ?? "" }}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
