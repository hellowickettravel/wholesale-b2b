import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "./spinner";

/*
 * Loading shapes in kraft. Each one copies the grid, padding and block heights of the real screen it stands
 * in for, so the swap from skeleton to content does not move anything. They carry no text and are
 * aria-hidden; <LoadingRegion> adds one polite "Loading" status and aria-busy for assistive tech.
 * The calm pulse (see `.skeleton` in globals.css) starts after 300ms, so a fast load never flashes, and it is
 * switched off under reduced motion.
 */

/** Wrap a skeleton page. Screen readers hear `label` once; the shapes themselves are hidden. */
export function LoadingRegion({ label = "Loading", children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <div aria-busy="true" className={className}>
      <p role="status" className="sr-only">
        {label}
      </p>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/** Same footprint as ShopTitle / PageHeader: display-l title, optional sentence, optional action. */
export function PageHeaderSkeleton({ description = true, action = false, className }: { description?: boolean; action?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between sm:pb-6", className)}>
      <div className="min-w-0">
        <Skeleton className="h-[2.0625rem] w-48 rounded-[var(--radius-md)] sm:h-[2.75rem] sm:w-64" />
        {description ? <Skeleton className="mt-2.5 h-5 w-full max-w-sm" /> : null}
      </div>
      {action ? <Skeleton className="h-11 w-36 rounded-[var(--radius-md)]" /> : null}
    </div>
  );
}

/** Category chips: 44px pills in a horizontal strip. */
export function ChipRowSkeleton({ count = 7, className }: { count?: number; className?: string }) {
  const widths = ["w-14", "w-24", "w-32", "w-28", "w-20", "w-36", "w-24", "w-28"];
  return (
    // flex-wrap + a fixed height clips the overflow chips instead of letting them widen the page
    <div className={cn("-mx-4 flex h-11 flex-wrap gap-x-2 overflow-hidden px-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={cn("h-11 shrink-0 rounded-full", widths[i % widths.length])} />
      ))}
    </div>
  );
}

/** A product card: kraft tile with an empty plate outline, then three short lines and a pill. */
export function ProductCardSkeleton() {
  return (
    <li className="min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
      <div className="skeleton aspect-[5/4] rounded-none" />
      <div className="flex flex-col gap-2 p-3 sm:p-4">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-1 h-7 w-28 rounded-[var(--radius-sm)]" />
      </div>
    </li>
  );
}

/** The catalogue grid: 2 columns on phones, 3 on tablets, 4 on desktop (same classes as the page). */
export function ProductGridSkeleton({ count = 12, className }: { count?: number; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </ul>
  );
}

/** The shelf band that opens a public catalogue page: a kraft ground with an empty plate. */
export function ShelfBandSkeleton() {
  return (
    <div className="skeleton rounded-none">
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        <div className="skeleton-plate h-[4.75rem] w-64 sm:h-[5.5rem] sm:w-[22rem]" />
      </div>
    </div>
  );
}

/** A product page: big tile, then title, price block, size select, add button, description. */
export function ProductPageSkeleton({ variant = "shop" }: { variant?: "shop" | "public" }) {
  const shop = variant === "shop";
  return (
    <div>
      <div className="flex items-center gap-2 py-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className={cn("mt-2 grid gap-x-12 gap-y-5 md:mt-4", shop ? "md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" : "md:grid-cols-2")}>
        <div className="skeleton relative aspect-[16/10] w-full rounded-[var(--radius-xl)] md:aspect-[5/4]">
          <div className="skeleton-plate absolute inset-5 sm:inset-8" />
        </div>
        <div className="min-w-0">
          <Skeleton className="h-[2.0625rem] w-4/5 rounded-[var(--radius-md)] sm:h-[2.75rem]" />
          <Skeleton className="mt-2 h-[2.0625rem] w-1/2 rounded-[var(--radius-md)] sm:h-[2.75rem]" />
          <div className="mt-5 space-y-4 rounded-[var(--radius-lg)] border border-line bg-raised p-4 sm:p-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-[1.875rem] w-36" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-12 w-32 rounded-[var(--radius-md)]" />
              <Skeleton className="h-12 flex-1 rounded-[var(--radius-md)]" />
            </div>
          </div>
          <div className="mt-6 max-w-prose space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Basket: progress strip, three line rows and the summary card (beside the lines from lg up). */
export function BasketSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8">
      <section className="min-w-0">
        <div className="mb-4">
          <Skeleton className="h-6 w-64 max-w-full" />
          <Skeleton className="mt-2.5 h-2.5 w-full rounded-full" />
          <Skeleton className="mt-2.5 h-4 w-full max-w-md" />
        </div>
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
          {[0, 1, 2].map((i) => (
            <li key={i} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 px-3 py-3.5 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 sm:px-4">
              <Skeleton className="size-14 rounded-[var(--radius-md)] sm:size-16" />
              <div className="min-w-0 space-y-2 self-center">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
                <Skeleton className="h-11 w-32 rounded-[var(--radius-md)]" />
                <Skeleton className="ml-auto h-6 w-20" />
                <Skeleton className="size-11 rounded-[var(--radius-md)]" />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="space-y-4">
        <div className="rounded-[var(--radius-lg)] border border-line bg-raised p-5">
          <Skeleton className="h-6 w-40" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t-[1.5px] border-dashed border-line pt-4">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-7 w-28" />
            </div>
          </div>
        </div>
        <div className="space-y-4 rounded-[var(--radius-lg)] border border-line bg-raised p-5">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-16 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-[3.25rem] w-full rounded-[var(--radius-md)]" />
        </div>
      </div>
    </div>
  );
}

/** A list of cards (orders, invoices): the same padding as the real order row. */
export function CardListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-[var(--radius-lg)] border border-line bg-raised px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-20 rounded-[var(--radius-sm)]" />
          </div>
          <Skeleton className="h-7 w-20 md:order-4" />
          <div className="col-span-2 flex gap-8 md:contents">
            <div className="space-y-1.5 md:order-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-1.5 md:order-3">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <Skeleton className="hidden size-5 md:order-5 md:block" />
        </li>
      ))}
    </ul>
  );
}

/** A raised card with a header line and rows of label and value, for account and detail screens. */
export function CardSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-[var(--radius-lg)] border border-line bg-raised", className)}>
      <div className="border-b border-line px-5 py-4">
        <Skeleton className="h-6 w-44" />
      </div>
      <div className="space-y-4 px-5 py-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <Skeleton className="h-4 w-28 shrink-0" />
            <Skeleton className={cn("h-4 w-full", i % 2 ? "max-w-40" : "max-w-56")} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A data table in a card: kraft header row, hairline rows. Columns share the width; phones show three. */
export function TableSkeleton({ rows = 8, cols = 5, className }: { rows?: number; cols?: number; className?: string }) {
  const widths = ["max-w-24", "max-w-40", "max-w-20", "max-w-32", "max-w-16", "max-w-28"];
  const grid = "grid grid-flow-col auto-cols-fr items-center gap-6 px-4";
  const cell = "max-sm:nth-[n+4]:hidden";
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised", className)}>
      <div className={cn("skeleton h-11 rounded-none", grid)}>
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className={cn("h-3.5 w-full rounded-[var(--radius-sm)] bg-ink/10", cell, widths[(i + 2) % widths.length])} />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className={cn("h-[3.25rem]", grid)}>
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton key={c} className={cn("h-4 w-full", cell, widths[(r + c) % widths.length])} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Four headline figures (admin dashboard, order detail). */
export function StatStripSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-[var(--radius-lg)] border border-line bg-raised px-5 py-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-9 w-32" />
          <Skeleton className="mt-2.5 h-4 w-40 max-w-full" />
        </div>
      ))}
    </div>
  );
}

/** A detail screen: optional stat strip, then a wide card and a narrow one side by side from xl. */
export function DetailSkeleton({ stats = false }: { stats?: boolean }) {
  return (
    <div className="space-y-6">
      {stats ? <StatStripSkeleton /> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <TableSkeleton rows={5} cols={4} />
        <div className="space-y-6">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
}

/** The driver's job on a phone: the delivery card, then the proof form and its one big button. */
export function DriverJobSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-lg)] border border-line bg-raised p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-6 w-3/4" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-2/3" />
        <Skeleton className="mt-4 h-5 w-48" />
        <Skeleton className="mt-3 h-11 w-full rounded-[var(--radius-md)]" />
      </div>
      <div className="space-y-4 rounded-[var(--radius-lg)] border border-line bg-raised p-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-14 w-full rounded-[var(--radius-md)]" />
        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        <Skeleton className="h-14 w-full rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

/** A bordered list of two-line rows with a chevron (supplier orders, simple lists). */
export function RowListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <ul className={cn("divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-20 rounded-[var(--radius-sm)]" />
            </div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
          <Skeleton className="size-4 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

/** Restaurant order detail: delivery parts with their lines on the left, totals on the right from lg. */
export function OrderDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
      <div className="space-y-5">
        <TableSkeleton rows={4} cols={3} />
        <TableSkeleton rows={3} cols={3} />
      </div>
      <div className="space-y-5">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={4} />
      </div>
    </div>
  );
}
