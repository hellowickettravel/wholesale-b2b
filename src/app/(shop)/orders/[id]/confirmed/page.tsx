import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { BankDetails } from "@/components/shop/bank-details";
import { LinkButton } from "@/components/ui/button";
import { formatDayDate } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import { orderRef, PAYMENT_TERMS_LABEL } from "@/domain/status";
import { requireRole } from "@/server/auth";
import { getBankSettings, getCustomerOrder } from "@/server/customer-orders";

export const metadata: Metadata = { title: "Order placed" };

export default async function OrderConfirmedPage({ params }: PageProps<"/orders/[id]/confirmed">) {
  await requireRole("customer");
  const { id } = await params;
  const [found, bank] = await Promise.all([getCustomerOrder(id), getBankSettings()]);
  if (!found) notFound();
  const { order, parts } = found;
  const ref = orderRef(order.number!);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center pb-6 pt-2 text-center">
        <div className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-[28px]">Order {ref} placed</h1>
        <p className="mt-2 max-w-md text-[15px] text-ink-muted">
          Thank you. We have passed it to our suppliers for delivery on{" "}
          <span className="font-semibold text-ink">{formatDayDate(order.delivery_date!)}</span>
          {parts.length > 1 ? <>. It will arrive in {parts.length} deliveries, one from each supplier.</> : "."}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line text-sm sm:grid-cols-3">
        <div className="bg-raised p-4">
          <dt className="text-ink-muted">Total inc VAT</dt>
          <dd className="tabular mt-0.5 text-lg font-bold">{formatPence(Number(order.total_pence))}</dd>
        </div>
        <div className="bg-raised p-4">
          <dt className="text-ink-muted">Delivery</dt>
          <dd className="mt-0.5 font-semibold">{formatDayDate(order.delivery_date!)}</dd>
        </div>
        <div className="col-span-2 bg-raised p-4 sm:col-span-1">
          <dt className="text-ink-muted">Payment</dt>
          <dd className="mt-0.5 font-semibold">{PAYMENT_TERMS_LABEL[order.payment_terms!]}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <BankDetails bank={bank} reference={ref} amountPence={Number(order.total_pence)} payBy={order.promised_pay_date} />
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <LinkButton href={`/orders/${order.id}`} variant="secondary">View order</LinkButton>
        <LinkButton href="/shop">Continue shopping</LinkButton>
      </div>
    </div>
  );
}
