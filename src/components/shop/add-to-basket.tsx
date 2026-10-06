"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ShoppingBasket } from "lucide-react";
import { addToBasket } from "@/app/(shop)/basket/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatPence } from "@/domain/money";
import { cn } from "@/lib/cn";
import { QtyStepper } from "./qty-stepper";
import { useSizeSelection } from "./size-selection";

export interface SizeOption {
  id: string;
  sizeLabel: string;
  /** What the restaurant pays per unit, ex or inc VAT as the shop shows it; null = no price yet. */
  displayPence: number | null;
  orderable: boolean;
}

/**
 * Size dropdown + price + quantity + Add. Used on shop rows ("row") and the product page
 * ("page"). Receives only the restaurant's own resolved prices. On the product page the chosen size is
 * shared with the tile through SizeSelectionProvider, and on phones the quantity + Add bar docks above the
 * tab bar once the inline one has scrolled out of view (the same element, never a second copy).
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
  const shared = useSizeSelection();
  const [ownSizeId, setOwnSizeId] = useState(initialSizeId ?? firstOrderable.id);
  const sizeId = shared?.sizeId ?? ownSizeId;
  const setSizeId = shared?.setSizeId ?? setOwnSizeId;
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const size = sizes.find((s) => s.id === sizeId) ?? firstOrderable;
  const page = layout === "page";

  // Product page, phones: dock the buy bar above the tab bar while its inline slot is out of view.
  const slot = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);
  const hasBar = page && size.orderable;
  useEffect(() => {
    const el = slot.current;
    if (!hasBar || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setDocked(!entry.isIntersecting), { rootMargin: "0px 0px -72px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasBar]);

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
      <span className="inline-flex h-8 items-center whitespace-nowrap rounded-[var(--radius-sm)] bg-sunken px-2.5 text-sm font-bold text-ink-muted">Price on request</span>
    ) : page ? (
      <span className="flex items-baseline gap-2">
        <span className="tabular text-[1.875rem] font-bold leading-none text-ink">{formatPence(size.displayPence)}</span>
        <span className="text-xs font-semibold text-ink-muted">{vatLabel}</span>
      </span>
    ) : (
      <span className="flex flex-col leading-none">
        <span className="tabular text-xl font-bold text-ink">{formatPence(size.displayPence)}</span>
        <span className="mt-1 text-xs font-semibold text-ink-muted">{vatLabel}</span>
      </span>
    );

  const sizeSelect = (
    <Select
      id={`size-${firstOrderable.id}`}
      aria-label={page ? undefined : `Size of ${productName}`}
      value={size.id}
      onChange={(e) => setSizeId(e.target.value)}
      className={page ? "font-semibold" : "text-sm font-semibold sm:!h-11"}
    >
      {sizes.map((s) => (
        <option key={s.id} value={s.id}>
          {s.sizeLabel}
          {s.displayPence !== null ? ` · ${formatPence(s.displayPence)}` : " · price on request"}
        </option>
      ))}
    </Select>
  );

  const addButton = (
    <Button
      onClick={add}
      loading={pending}
      size={page ? "lg" : "md"}
      className={cn(page ? "flex-1 md:flex-none md:px-8" : "px-5")}
      icon={added ? <Check className="size-4 motion-safe:animate-bump" strokeWidth={3} aria-hidden="true" /> : <ShoppingBasket className="size-4" aria-hidden="true" />}
      aria-label={`Add ${productName} ${size.sizeLabel} to basket`}
    >
      {added ? "Added" : page ? "Add to basket" : "Add"}
    </Button>
  );
  const stepper = <QtyStepper value={qty} onChange={setQty} label={`Quantity of ${productName} ${size.sizeLabel}`} disabled={pending} className={page ? "h-12" : undefined} />;

  const errorText = error ? <p role="alert" className="col-span-full text-sm font-semibold text-danger">{error}</p> : null;

  if (page) {
    return (
      <>
        <div className="mt-5 space-y-4 rounded-[var(--radius-lg)] border border-line bg-raised p-4 shadow-rest sm:p-5">
          <div aria-live="polite">
            <p className="mb-1.5 text-sm font-semibold text-ink-muted">Your price</p>
            {price}
          </div>
          {sizes.length > 1 ? (
            <div className="space-y-1.5">
              <label htmlFor={`size-${firstOrderable.id}`} className="block text-sm font-bold text-ink">Pack size</label>
              {sizeSelect}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Pack size: <span className="font-bold text-ink">{size.sizeLabel}</span></p>
          )}
          {!size.orderable ? <p className="text-sm text-ink-muted">This size has no price for your account yet. Ask us and we will add it.</p> : null}
        </div>
        {size.orderable ? (
          <div ref={slot} className="mt-3 h-12">
            <div
              className={cn(
                "flex items-center gap-3",
                docked &&
                  "max-md:fixed max-md:inset-x-0 max-md:bottom-[calc(4rem+env(safe-area-inset-bottom))] max-md:z-20 max-md:border-t max-md:border-line max-md:bg-raised max-md:px-4 max-md:py-3 max-md:shadow-[0_-12px_20px_-16px_rgb(42_28_20/0.45)] motion-safe:max-md:animate-toast-in",
              )}
            >
              {stepper}
              {addButton}
            </div>
          </div>
        ) : null}
        {errorText ? <div className="mt-3">{errorText}</div> : null}
      </>
    );
  }

  const controls = size.orderable ? (
    <div className="flex items-center justify-end gap-2">
      {stepper}
      {addButton}
    </div>
  ) : null;

  // Row: [size][price][qty + Add] in fixed columns on wide screens so rows line up; below that the size
  // dropdown takes the first line and price + controls share the second.
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 @min-[56rem]:grid-cols-[11rem_6rem_14rem]">
      {sizes.length > 1 ? (
        <div className="col-span-2 min-w-0 @min-[56rem]:col-span-1">{sizeSelect}</div>
      ) : (
        <span className="hidden truncate text-sm font-semibold text-ink-muted @min-[56rem]:block">{size.sizeLabel}</span>
      )}
      <div aria-live="polite" className="@min-[56rem]:text-right">{price}</div>
      <div>{controls}</div>
      {errorText}
    </div>
  );
}
