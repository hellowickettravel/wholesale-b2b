"use client";

import { useState, useTransition } from "react";
import { Check, ShoppingBasket } from "lucide-react";
import { addToBasket } from "@/app/(shop)/basket/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatPence } from "@/domain/money";
import { cn } from "@/lib/cn";
import { QtyStepper } from "./qty-stepper";

export interface SizeOption {
  id: string;
  sizeLabel: string;
  /** What the restaurant pays per unit, ex or inc VAT as the shop shows it; null = no price yet. */
  displayPence: number | null;
  orderable: boolean;
}

/**
 * Size dropdown + price + quantity + Add. Used on shop rows ("row") and the product page
 * ("page"). Receives only the restaurant's own resolved prices.
 */
export function AddToBasket({
  productName,
  sizes,
  vatLabel,
  layout = "row",
  initialSizeId,
}: {
  productName: string;
  sizes: SizeOption[];
  vatLabel: string;
  layout?: "row" | "page";
  initialSizeId?: string;
}) {
  const firstOrderable = sizes.find((s) => s.orderable) ?? sizes[0];
  const [sizeId, setSizeId] = useState(initialSizeId ?? firstOrderable.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const size = sizes.find((s) => s.id === sizeId) ?? firstOrderable;
  const page = layout === "page";

  function add() {
    setError(null);
    start(async () => {
      const r = await addToBasket(size.id, qty);
      if (r.ok) {
        setAdded(true);
        setQty(1);
        toast({ tone: "success", message: `Added ${qty} × ${productName} ${size.sizeLabel}` });
        setTimeout(() => setAdded(false), 2000);
      } else {
        setError(r.error);
      }
    });
  }

  const price =
    size.displayPence === null ? (
      <span className="whitespace-nowrap text-sm font-semibold text-ink-muted">Price on request</span>
    ) : page ? (
      <span className="flex items-baseline gap-1.5">
        <span className="tabular text-3xl font-bold text-ink">{formatPence(size.displayPence)}</span>
        <span className="text-xs text-ink-subtle">{vatLabel}</span>
      </span>
    ) : (
      <span className="flex flex-col leading-tight">
        <span className="tabular text-lg font-bold text-ink">{formatPence(size.displayPence)}</span>
        <span className="text-[11px] text-ink-subtle">{vatLabel}</span>
      </span>
    );

  const sizeSelect = (
    <Select
      id={`size-${firstOrderable.id}`}
      aria-label={page ? undefined : `Size of ${productName}`}
      value={size.id}
      onChange={(e) => setSizeId(e.target.value)}
      className={page ? undefined : "h-10 text-sm sm:h-9"}
    >
      {sizes.map((s) => (
        <option key={s.id} value={s.id}>
          {s.sizeLabel}
          {s.displayPence !== null ? ` · ${formatPence(s.displayPence)}` : " · price on request"}
        </option>
      ))}
    </Select>
  );

  const controls = size.orderable ? (
    <div className={cn("flex items-center gap-2", page ? "pt-1" : "justify-end")}>
      <QtyStepper value={qty} onChange={setQty} label={`Quantity of ${productName} ${size.sizeLabel}`} disabled={pending} />
      <Button
        onClick={add}
        loading={pending}
        size={page ? "lg" : "md"}
        className={cn(page ? "flex-1 sm:flex-none" : "h-10 sm:h-9")}
        icon={added ? <Check className="size-4" aria-hidden="true" /> : <ShoppingBasket className="size-4" aria-hidden="true" />}
        aria-label={`Add ${productName} ${size.sizeLabel} to basket`}
      >
        {added ? "Added" : page ? "Add to basket" : "Add"}
      </Button>
    </div>
  ) : page ? (
    <p className="text-sm text-ink-muted">This size has no price for your account yet. Ask us and we will add it.</p>
  ) : null;

  const errorText = error ? <p role="alert" className="col-span-full text-sm font-medium text-danger">{error}</p> : null;

  if (page) {
    return (
      <div className="min-w-0 space-y-4">
        <div aria-live="polite">{price}</div>
        {sizes.length > 1 ? (
          <div className="space-y-1.5">
            <label htmlFor={`size-${firstOrderable.id}`} className="block text-sm font-medium text-ink">Pack size</label>
            {sizeSelect}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Pack size: <span className="font-semibold text-ink">{size.sizeLabel}</span></p>
        )}
        {controls}
        {errorText}
      </div>
    );
  }

  // Row: [size][price][qty + Add] in fixed columns on desktop so rows line up; on phones the
  // size dropdown takes the first line and price + controls share the second.
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 lg:grid-cols-[13rem_7.5rem_14rem]">
      {sizes.length > 1 ? (
        <div className="col-span-2 min-w-0 lg:col-span-1">{sizeSelect}</div>
      ) : (
        <span className="hidden truncate text-sm text-ink-muted lg:block">{size.sizeLabel}</span>
      )}
      <div aria-live="polite" className="lg:text-right">{price}</div>
      <div>{controls}</div>
      {errorText}
    </div>
  );
}
