"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState, useTransition, type ReactNode } from "react";
import { AnimatePresence, m, useIsPresent } from "framer-motion";
import { AlertTriangle, Trash2, Truck } from "lucide-react";
import { ProductImage } from "@/components/brand/product-image";
import { MotionRoot } from "@/components/motion/motion-root";
import { useCollapseTransition, useInstant } from "@/components/motion/presets";
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
export function BasketCheckout(props: BasketCheckoutProps) {
  return (
    <MotionRoot>
      <BasketCheckoutForm {...props} />
    </MotionRoot>
  );
}

type BasketCheckoutProps = {
  lines: BasketLine[];
  delivery: DeliveryRules;
  deliveryDates: string[];
  today: string;
};

function BasketCheckoutForm({
  lines: initial,
  delivery,
  deliveryDates,
  today,
}: BasketCheckoutProps) {
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
  const continueRef = useRef<HTMLAnchorElement>(null);

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
  const card = "rounded-[var(--radius-lg)] border border-line bg-raised shadow-rest";

  // Pressing Remove unmounts the focused button. Hand focus to the next row's Remove (else the previous
  // row's, else "Continue shopping") first, so a keyboard user is never dropped onto <body>.
  function moveFocusFrom(button: HTMLElement) {
    const row = button.closest("li");
    const target = (start: Element | null | undefined, step: "nextElementSibling" | "previousElementSibling") => {
      for (let el = start; el; el = el[step]) {
        const b = el.hasAttribute("inert") ? null : el.querySelector<HTMLElement>("[data-remove-line]");
        if (b) return b;
      }
      return null;
    };
    (target(row?.nextElementSibling, "nextElementSibling") ?? target(row?.previousElementSibling, "previousElementSibling") ?? continueRef.current)?.focus();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8">
      <section aria-labelledby="lines-heading" className="min-w-0">
        <h2 id="lines-heading" className="sr-only">Items</h2>

        {/* Free-delivery progress: a kraft track with a turmeric fill. */}
        <div className="mb-4">
          <p className={cn("flex items-center gap-2 font-bold", !totals.deliveryCharged && totals.goodsNetPence > 0 ? "text-success" : "text-ink")}>
            <Truck className="size-5 shrink-0" aria-hidden="true" />
            {totals.goodsNetPence === 0
              ? "Add items to see delivery"
              : totals.deliveryCharged
                ? `Add ${formatPence(totals.shortOfMinimumPence)} more for free delivery`
                : "Free delivery"}
          </p>
          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
            {/* A full-width fill slid left by the shortfall (transform only; the track clips its left end). */}
            <div
              className="h-full w-full rounded-full bg-accent transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]"
              style={{ transform: `translateX(${progress - 100}%)` }}
            />
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            Orders of {formatPence(delivery.minOrderPence)} or more (ex VAT) deliver free. Below that, delivery is {formatPence(delivery.deliveryChargePence)} + VAT.
          </p>
        </div>

        {lineError ? <Alert tone="danger" className="mb-3">{lineError}</Alert> : null}
        <ul className={cn(card, "overflow-hidden")}>
          <AnimatePresence initial={false}>
            {lines.map((l) => {
              const label = `${l.productName} ${l.sizeLabel}`;
              return (
                <BasketRow key={l.variantId} problem={!!l.problem}>
                    <ProductImage
                      variant="thumb"
                      src={publicImageUrl(l.imagePath)}
                      alt=""
                      name={l.productName}
                      categorySlug={l.categorySlug}
                      sizeLabel={l.sizeLabel}
                      sizes="64px"
                      className={cn("size-14 rounded-[var(--radius-md)] sm:size-16", l.problem && "opacity-60 saturate-50")}
                    />
                    <div className="min-w-0 self-center">
                      {l.productSlug ? (
                        <Link href={`/shop/p/${l.productSlug}`} className="line-clamp-2 text-[1.0625rem] font-bold leading-snug text-ink hover:text-primary hover:underline hover:underline-offset-2">{l.productName}</Link>
                      ) : (
                        <span className="line-clamp-2 text-[1.0625rem] font-bold leading-snug text-ink">{l.productName}</span>
                      )}
                      <p className="mt-0.5 text-sm font-semibold text-ink-muted">{l.sizeLabel}</p>
                      {l.pricePence !== null && !l.problem ? (
                        <p className="text-[0.8125rem] text-ink-muted">
                          <span className="tabular">{formatPence(l.pricePence)}</span> each{l.vatRateBp ? `, plus ${formatBp(l.vatRateBp)} VAT` : ", no VAT"}
                        </p>
                      ) : null}
                      {l.problem ? (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-warning">
                          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" /> {PROBLEM[l.problem]}
                        </p>
                      ) : null}
                    </div>
                    <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:gap-3">
                      {l.problem ? null : <QtyStepper value={l.qty} onChange={(q) => changeQty(l.variantId, q)} label={`Quantity of ${label}`} />}
                      <span className="tabular ml-auto min-w-[4.5rem] text-right text-lg font-bold text-ink">
                        {l.problem || l.pricePence === null ? "" : formatPence(l.pricePence * l.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          moveFocusFrom(e.currentTarget);
                          changeQty(l.variantId, 0);
                        }}
                        data-remove-line=""
                        aria-label={`Remove ${label}`}
                        className={cn(
                          "inline-flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius-md)] font-bold transition-colors hover:bg-danger-soft hover:text-danger",
                          l.problem ? "border-[1.5px] border-warning bg-raised px-4 text-warning" : "w-11 text-ink-muted",
                        )}
                      >
                        <Trash2 className="size-[18px]" aria-hidden="true" />
                        {l.problem ? <span className="text-sm">Remove</span> : null}
                      </button>
                    </div>
                </BasketRow>
              );
            })}
          </AnimatePresence>
        </ul>
        <p className="mt-4 text-sm text-ink-muted">
          <Link ref={continueRef} href="/shop" className="inline-flex min-h-11 items-center font-bold text-primary hover:underline">Continue shopping</Link>
          <span className="ml-3">Prices are per unit, ex VAT.</span>
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

        <section aria-labelledby="summary-heading" className={cn(card, "p-5")}>
          <h2 id="summary-heading" className="text-xl">Order summary</h2>
          <dl className="mt-4 space-y-2.5" aria-live="polite">
            <Row label="Goods (ex VAT)" value={formatPence(totals.goodsNetPence)} />
            <Row label="Delivery (ex VAT)" value={totals.deliveryCharged ? formatPence(totals.deliveryNetPence) : "Free"} />
            {totals.vatBands.length > 1 && totals.vatBands.map((b) => (
              <Row key={b.rateBp} muted label={`VAT ${formatBp(b.rateBp)} on ${formatPence(b.goodsNetPence + b.deliveryNetPence)}`} value={formatPence(b.goodsVatPence + b.deliveryVatPence)} />
            ))}
            <Row label="VAT" value={formatPence(totals.vatPence)} />
            <div className="flex items-baseline justify-between border-t-[1.5px] border-dashed border-line-strong pt-4">
              <dt className="text-lg font-bold text-ink">Total</dt>
              <dd className="tabular text-[1.75rem] font-bold leading-none text-ink" data-testid="basket-total">{formatPence(totals.totalPence)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="checkout-heading" className={cn(card, "space-y-4 p-5")}>
          <h2 id="checkout-heading" className="text-xl">Delivery and payment</h2>
          {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

          <Field label="Delivery date" error={fe.delivery_date} hint="We deliver on the days shown. The supplier brings it to your address on file.">
            {(p) => (
              <Select {...p} name="delivery_date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="font-semibold">
                {deliveryDates.map((d) => (
                  <option key={d} value={d} suppressHydrationWarning>{formatDayDate(d)}</option>
                ))}
              </Select>
            )}
          </Field>

          <fieldset>
            <legend className="text-sm font-bold text-ink">When will you pay?</legend>
            <div className="mt-2 space-y-2">
              {TERMS.map((t) => (
                <label
                  key={t.value}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border-[1.5px] p-3 transition-colors duration-[var(--dur-fast)]",
                    terms === t.value ? "border-primary bg-primary-soft" : "border-line-strong bg-raised hover:bg-sunken",
                  )}
                >
                  <input
                    type="radio"
                    name="payment_terms"
                    value={t.value}
                    checked={terms === t.value}
                    onChange={() => setTerms(t.value)}
                    className="mt-0.5 size-5 shrink-0 accent-[var(--brand-primary)]"
                  />
                  <span>
                    <span className="block text-[0.9375rem] font-bold text-ink">{t.label}</span>
                    <span className="block text-[0.8125rem] text-ink-muted" suppressHydrationWarning>{t.hint(deliveryDate || null)}</span>
                  </span>
                </label>
              ))}
            </div>
            {fe.payment_terms ? <p className="mt-1.5 text-sm font-semibold text-danger">{fe.payment_terms}</p> : null}
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
            className="!h-[3.25rem] text-lg"
          >
            Place order · {formatPence(totals.totalPence)}
          </Button>
          <p className="text-center text-sm text-ink-muted">Payment is by bank transfer. You will see our bank details on the next page.</p>
        </section>
      </form>
    </div>
  );
}

/**
 * A basket row. The <li> is the animated shell (no padding, so only height has to animate); the row's look
 * lives on the inner div. Removing a line collapses it (height 200ms, opacity 120ms) instead of letting the
 * rows below jump. Only removal animates: quantity edits are tens of taps and stay instant. `initial={false}`:
 * the first render and server HTML are never hidden or mid-animation. The exiting row is `inert`, so it can
 * be neither focused nor clicked while it leaves. Under reduced motion there is no exit at all.
 */
function BasketRow({ problem, children }: { problem: boolean; children: ReactNode }) {
  const present = useIsPresent(); // valid here: BasketRow is a direct child of AnimatePresence
  const transition = useCollapseTransition();
  const instant = useInstant();
  return (
    <m.li
      inert={!present}
      initial={false}
      animate={{ height: "auto", opacity: 1 }}
      exit={instant ? undefined : { height: 0, opacity: 0 }}
      transition={transition}
      style={{ overflow: "hidden" }}
      // The divider is an inset hairline on the row (not a border on the <li>), so a row that is collapsing to
      // height 0 leaves no 1px border behind to snap away at the end.
      className="[&:not(:last-child)>div]:shadow-[inset_0_-1px_0_var(--line)]"
    >
      <div
        className={cn(
          "grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 px-3 py-3.5 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 sm:px-4",
          problem && "border-l-4 border-l-warning bg-warning-soft",
        )}
      >
        {children}
      </div>
    </m.li>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", muted ? "pl-3 text-[0.8125rem] text-ink-muted" : "text-[0.9375rem]")}>
      <dt>{label}</dt>
      <dd className="tabular font-semibold">{value}</dd>
    </div>
  );
}
