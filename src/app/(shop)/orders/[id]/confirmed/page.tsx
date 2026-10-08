import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BankDetails } from "@/components/shop/bank-details";
import { LinkButton } from "@/components/ui/button";
import { formatDayDate } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import { orderRef, PAYMENT_TERMS_LABEL } from "@/domain/status";
import { requireRole } from "@/server/auth";
import { getBankSettings, getCustomerOrder } from "@/server/customer-orders";

export const metadata: Metadata = { title: "Order placed" };

/**
 * After "Place order": the one reward moment. The plate stamps down (320ms) while the tick draws itself, then
 * the blocks rise one after another (70ms apart, so the bank details are not last to arrive). All CSS: the
 * page is server-rendered and holds the payment details, so it must not wait for hydration to be visible.
 */
export default async function OrderConfirmedPage({ params }: PageProps<"/orders/[id]/confirmed">) {
  await requireRole("customer");
  const { id } = await params;
  const [found, bank] = await Promise.all([getCustomerOrder(id), getBankSettings()]);
  if (!found) notFound();
  const { order, parts } = found;
  const ref = orderRef(order.number!);
  // Each block fades up just behind the stamp (motion-safe only; without motion everything is simply there).
  const after = (n: number) => ({ animationDelay: `${240 + n * 70}ms` });
  const rise = "motion-safe:animate-toast-in";

  return (
    <div className="mx-auto max-w-2xl">
      <div data-ground="tea-powders-and-milk-mix" data-weave="a" className="weave grid place-items-center rounded-[var(--radius-xl)] px-4 py-12 sm:py-16">
        <div className="plate w-full max-w-xl px-6 py-8 text-center sm:px-8 sm:py-10 motion-safe:animate-stamp">
          <svg viewBox="0 0 48 48" className="mx-auto size-12 text-primary" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="24" cy="24" r="20" strokeWidth="2.5" pathLength="1" className="motion-safe:[stroke-dasharray:1] motion-safe:[stroke-dashoffset:1] motion-safe:animate-[draw_300ms_var(--ease-out)_80ms_both]" />
            <path d="M15 25l7 7 12-14" pathLength="1" className="motion-safe:[stroke-dasharray:1] motion-safe:[stroke-dashoffset:1] motion-safe:animate-[draw_220ms_var(--ease-out)_300ms_both]" />
          </svg>
          <h1 className="mt-4 text-[clamp(1.625rem,1.2rem+2.4vw,2.5rem)] leading-[1.1] [text-wrap:wrap]">Order {ref} placed</h1>
        </div>
      </div>

      <p className={`mx-auto mt-6 max-w-prose text-center text-lg text-ink-muted ${rise}`} style={after(0)}>
        Thank you. We have passed it to our suppliers for delivery on{" "}
        <span className="font-bold text-ink">{formatDayDate(order.delivery_date!)}</span>
        {parts.length > 1 ? <>. It will arrive in {parts.length} deliveries, one from each supplier.</> : "."}
      </p>

      <dl className={`mt-6 divide-y divide-dashed divide-line-strong rounded-[var(--radius-lg)] border border-line bg-raised px-5 py-1 shadow-rest ${rise}`} style={after(1)}>
        <div className="flex items-baseline justify-between gap-4 py-3.5">
          <dt className="text-ink-muted">Total inc VAT</dt>
          <dd className="tabular text-2xl font-bold">{formatPence(Number(order.total_pence))}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-3.5">
          <dt className="text-ink-muted">Delivery</dt>
          <dd className="text-right font-bold">{formatDayDate(order.delivery_date!)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-3.5">
          <dt className="text-ink-muted">Payment</dt>
          <dd className="text-right font-bold">{PAYMENT_TERMS_LABEL[order.payment_terms!]}</dd>
        </div>
      </dl>

      <div className={`mt-5 ${rise}`} style={after(2)}>
        <BankDetails bank={bank} reference={ref} amountPence={Number(order.total_pence)} payBy={order.promised_pay_date} />
      </div>

      <div className={`mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center ${rise}`} style={after(3)}>
        <LinkButton href={`/orders/${order.id}`} variant="secondary" size="lg">View order</LinkButton>
        <LinkButton href="/shop" size="lg">Continue shopping</LinkButton>
      </div>
    </div>
  );
}
