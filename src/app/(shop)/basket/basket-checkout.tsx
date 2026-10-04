"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, useTransition } from "react";
import { AlertTriangle, Trash2, Truck } from "lucide-react";
import { ProductImage } from "@/components/brand/product-image";
import { CategoryArt } from "@/components/catalogue/category-art";
import { QtyStepper } from "@/components/shop/qty-stepper";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { addDays, formatDayDate, type PaymentTerms } from "@/domain/dates";
import { formatBp, formatPence } from "@/domain/money";
import { computeTotals, type DeliveryRules } from "@/domain/totals";
import { cn } from "@/lib/cn";
import { publicImageUrl } from "@/lib/storage";
import type { BasketLine, BasketProblem } from "@/server/shop";
import { placeOrder, setBasketQty, type CheckoutState } from "./actions";

const PROBLEM: Record<BasketProblem, string> = {
  hidden: "No longer on your list",
  unpriced: "No price yet: ask us",
  unavailable: "Not available at the moment",
};

const TERMS: { value: PaymentTerms; label: string; hint: (delivery: string | null) => string }[] = [
  { value: "on_delivery", label: "Pay on delivery", hint: () => "Bank transfer on the day we deliver." },
  { value: "within_7_days", label: "Within 7 days", hint: (d) => (d ? `Bank transfer by ${formatDayDate(addDays(d, 7))}.` : "Bank transfer within 7 days of delivery.") },
  { value: "on_date", label: "On a date I choose", hint: () => "Pick the date you will pay." },
];

/**
 * Basket + checkout. Totals are previewed here with the same domain code the server uses;
 * the server recomputes everything when the order is placed and refuses it if the total moved.
 */
export function BasketCheckout({
  lines: initial,
  delivery,
  deliveryDates,
  today,
}: {
  lines: BasketLine[];
  delivery: DeliveryRules;
  deliveryDates: string[];
  today: string;
}) {
  // Local quantities are the source of truth while editing; a new server list (an item
  // removed, or prices refreshed after a failed checkout) replaces them.
  const sig = JSON.stringify(initial);
  const [prevSig, setPrevSig] = useState(sig);
  const [lines, setLines] = useState(initial);
  if (sig !== prevSig) {
    setPrevSig(sig);
    setLines(initial);
  }

  const [saving, startSaving] = useTransition();
  const [lineError, setLineError] = useState<string | null>(null);
  const [checkoutKey] = useState(() => crypto.randomUUID());
  const [state, formAction, placing] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const [deliveryDate, setDeliveryDate] = useState(deliveryDates[0] ?? "");
  const [terms, setTerms] = useState<PaymentTerms>("on_delivery");

  const orderable = lines.filter((l) => l.problem === null && l.pricePence !== null);
  const blocked = lines.some((l) => l.problem !== null);
  const totals = computeTotals(orderable.map((l) => ({ unitPricePence: l.pricePence!, qty: l.qty, vatRateBp: l.vatRateBp })), delivery);

  function changeQty(variantId: string, qty: number) {
    setLines((ls) => (qty === 0 ? ls.filter((l) => l.variantId !== variantId) : ls.map((l) => (l.variantId === variantId ? { ...l, qty } : l))));
    setLineError(null);
    startSaving(async () => {
      const r = await setBasketQty(variantId, qty);
      if (!r.ok) setLineError(r.error);
    });
  }

  const fe = state.fieldErrors ?? {};
  const progress = delivery.minOrderPence > 0 ? Math.min(100, Math.round((totals.goodsNetPence / delivery.minOrderPence) * 100)) : 100;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <section aria-labelledby="lines-heading" className="min-w-0">
        <h2 id="lines-heading" className="sr-only">Items</h2>
        {lineError ? <Alert tone="danger" className="mb-3">{lineError}</Alert> : null}
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
          {lines.map((l) => {
            const label = `${l.productName} ${l.sizeLabel}`;
            return (
              <li key={l.variantId} className={cn("grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 px-3 py-3.5 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 sm:px-4", l.problem && "bg-warning-soft/40")}>
                <ProductImage
                  src={publicImageUrl(l.imagePath)}
                  alt=""
                  name={l.productName}
                  sizes="64px"
                  className="size-14 rounded-[var(--radius-md)] border border-line sm:size-16 [&_img]:p-1"
                  fallback={<CategoryArt slug={l.categorySlug} className="size-14 rounded-[var(--radius-md)] sm:size-16" iconClassName="size-6" />}
                />
                <div className="min-w-0 self-center">
                  {l.productSlug ? (
                    <Link href={`/shop/p/${l.productSlug}`} className="line-clamp-2 font-semibold leading-snug text-ink hover:text-primary">{l.productName}</Link>
                  ) : (
                    <span className="line-clamp-2 font-semibold leading-snug text-ink">{l.productName}</span>
                  )}
                  <p className="mt-0.5 text-[13px] text-ink-muted">
                    {l.sizeLabel}
                    {l.pricePence !== null && !l.problem ? (
                      <> · <span className="tabular">{formatPence(l.pricePence)}</span> each{l.vatRateBp ? ` + ${formatBp(l.vatRateBp)} VAT` : ", no VAT"}</>
                    ) : null}
                  </p>
                  {l.problem ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-warning">
                      <AlertTriangle className="size-3.5" aria-hidden="true" /> {PROBLEM[l.problem]}
                    </p>
                  ) : null}
                </div>
                <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:gap-3">
                  {l.problem ? null : <QtyStepper value={l.qty} onChange={(q) => changeQty(l.variantId, q)} label={`Quantity of ${label}`} />}
                  <span className="tabular ml-auto min-w-[4.5rem] text-right font-semibold text-ink">
                    {l.problem || l.pricePence === null ? "" : formatPence(l.pricePence * l.qty)}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeQty(l.variantId, 0)}
                    aria-label={`Remove ${label}`}
                    className="grid size-10 place-items-center rounded-[var(--radius-md)] text-ink-muted hover:bg-danger-soft hover:text-danger sm:size-9"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm text-ink-muted">
          <Link href="/shop" className="font-semibold text-primary hover:underline">Continue shopping</Link>
          <span aria-hidden="true"> · </span>Prices are per unit, ex VAT.
        </p>
      </section>

      <form
        noValidate
        className="space-y-4 lg:sticky lg:top-24"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        <input type="hidden" name="checkout_key" value={checkoutKey} />
        <input type="hidden" name="expected_total" value={totals.totalPence} />

        <section aria-labelledby="summary-heading" className="rounded-[var(--radius-lg)] border border-line bg-raised p-4 sm:p-5">
          <h2 id="summary-heading" className="text-base font-bold">Order summary</h2>
          <div className={cn("mt-3 rounded-[var(--radius-md)] p-3 text-sm", totals.deliveryCharged ? "bg-accent-soft text-accent-ink" : "bg-success-soft text-success")}>
            <p className="flex items-center gap-2 font-semibold">
              <Truck className="size-4 shrink-0" aria-hidden="true" />
              {totals.goodsNetPence === 0
                ? "Add items to see delivery"
                : totals.deliveryCharged
                  ? `Add ${formatPence(totals.shortOfMinimumPence)} more for free delivery`
                  : "Free delivery"}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70" aria-hidden="true">
              <div className={cn("h-full rounded-full", totals.deliveryCharged ? "bg-accent" : "bg-success")} style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1.5 text-xs opacity-80">
              Orders of {formatPence(delivery.minOrderPence)} or more (ex VAT) deliver free; below that, delivery is {formatPence(delivery.deliveryChargePence)} + VAT.
            </p>
          </div>

          <dl className="mt-4 space-y-2 text-sm" aria-live="polite">
            <Row label="Goods (ex VAT)" value={formatPence(totals.goodsNetPence)} />
            <Row label="Delivery (ex VAT)" value={totals.deliveryCharged ? formatPence(totals.deliveryNetPence) : "Free"} />
            {totals.vatBands.length > 1 && totals.vatBands.map((b) => (
              <Row key={b.rateBp} muted label={`VAT ${formatBp(b.rateBp)} on ${formatPence(b.goodsNetPence + b.deliveryNetPence)}`} value={formatPence(b.goodsVatPence + b.deliveryVatPence)} />
            ))}
            <Row label="VAT" value={formatPence(totals.vatPence)} />
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-bold text-ink">Total</dt>
              <dd className="tabular text-xl font-extrabold text-ink" data-testid="basket-total">{formatPence(totals.totalPence)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="checkout-heading" className="space-y-4 rounded-[var(--radius-lg)] border border-line bg-raised p-4 sm:p-5">
          <h2 id="checkout-heading" className="text-base font-bold">Delivery and payment</h2>
          {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

          <Field label="Delivery date" error={fe.delivery_date} hint="We deliver on the days shown. The supplier brings it to your address on file.">
            {(p) => (
              <Select {...p} name="delivery_date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}>
                {deliveryDates.map((d) => (
                  <option key={d} value={d}>{formatDayDate(d)}</option>
                ))}
              </Select>
            )}
          </Field>

          <fieldset>
            <legend className="text-sm font-medium text-ink">When will you pay?</legend>
            <div className="mt-2 space-y-2">
              {TERMS.map((t) => (
                <label
                  key={t.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-3 transition-colors",
                    terms === t.value ? "border-primary bg-primary-soft/50" : "border-line-strong hover:bg-sunken",
                  )}
                >
                  <input
                    type="radio"
                    name="payment_terms"
                    value={t.value}
                    checked={terms === t.value}
                    onChange={() => setTerms(t.value)}
                    className="mt-0.5 size-4 accent-[var(--brand-primary)]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{t.label}</span>
                    <span className="block text-[13px] text-ink-muted">{t.hint(deliveryDate || null)}</span>
                  </span>
                </label>
              ))}
            </div>
            {fe.payment_terms ? <p className="mt-1.5 text-[13px] font-medium text-danger">{fe.payment_terms}</p> : null}
          </fieldset>

          {terms === "on_date" ? (
            <Field label="Pay by" error={fe.pay_date}>
              {(p) => <Input {...p} type="date" name="pay_date" min={today} max={deliveryDate ? addDays(deliveryDate, 60) : undefined} defaultValue={deliveryDate} />}
            </Field>
          ) : null}

          <Field label="Note for this order (optional)" error={fe.note} hint="Delivery instructions, or anything else we should know.">
            {(p) => <Textarea {...p} name="note" maxLength={2000} rows={3} />}
          </Field>

          {blocked ? <Alert tone="warning">Remove the items marked above to place your order.</Alert> : null}
          {deliveryDates.length === 0 ? <Alert tone="warning">No delivery days are open at the moment. Please call us.</Alert> : null}

          <Button
            type="submit"
            size="lg"
            block
            loading={placing}
            disabled={saving || blocked || orderable.length === 0 || deliveryDates.length === 0}
          >
            Place order · {formatPence(totals.totalPence)}
          </Button>
          <p className="text-center text-xs text-ink-muted">Payment is by bank transfer. You will see our bank details on the next page.</p>
        </section>
      </form>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", muted && "pl-3 text-[13px] text-ink-muted")}>
      <dt>{label}</dt>
      <dd className="tabular font-medium">{value}</dd>
    </div>
  );
}
