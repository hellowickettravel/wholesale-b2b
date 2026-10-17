import type { ComponentProps } from "react";
import { formatPence, type Pence } from "@/domain/money";
import { cn } from "@/lib/cn";
import { AppLink } from "./route-progress";

/**
 * Data table. The wrapper scrolls sideways on small screens (and contains its own overscroll), so the page
 * itself never scrolls sideways. Sentence-case header on a light fill, hairline rows, a quiet hover tint.
 * Numbers and money: pass `numeric` to TH and TD (right-aligned, tabular), or use <MoneyTD pence={...} />.
 * Whole-row links: put <RowLink href> inside the first cell's text and pass `linked` to TR.
 */
export function Table({ className, ...rest }: ComponentProps<"table">) {
  return (
    <div className="relative min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
      <table className={cn("w-full border-collapse text-sm", className)} {...rest} />
    </div>
  );
}
export function THead({ className, ...rest }: ComponentProps<"thead">) {
  return <thead className={cn("bg-surface text-left", className)} {...rest} />;
}
export function TH({ className, numeric, ...rest }: ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn("whitespace-nowrap border-b border-line px-4 py-2.5 text-xs font-medium text-ink-muted", numeric ? "text-right" : "text-left", className)}
      {...rest}
    />
  );
}
export function TR({ className, linked, ...rest }: ComponentProps<"tr"> & { linked?: boolean }) {
  return (
    <tr
      className={cn(
        "border-b border-line transition-colors duration-[var(--dur-fast)] last:border-0 hover:bg-surface/70",
        linked && "relative cursor-pointer focus-within:bg-surface/70",
        className,
      )}
      {...rest}
    />
  );
}
/**
 * The row's main link. Its ::after covers the whole row (TR needs `linked`), so the row is one big target while
 * the link text stays the accessible name. Other links or buttons in the row need `relative z-10` to stay clickable.
 */
export function RowLink({ className, ...rest }: ComponentProps<typeof AppLink>) {
  return <AppLink className={cn("font-semibold text-ink after:absolute after:inset-0 hover:text-primary focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus", className)} {...rest} />;
}
export function TD({ className, numeric, ...rest }: ComponentProps<"td"> & { numeric?: boolean }) {
  return <td className={cn("px-4 py-3 align-middle text-ink", numeric && "tabular whitespace-nowrap text-right", className)} {...rest} />;
}
/** A right-aligned money cell. `bold` for totals and balances. */
export function MoneyTD({ pence, bold, className, ...rest }: Omit<ComponentProps<"td">, "children"> & { pence: Pence; bold?: boolean }) {
  return (
    <TD numeric className={cn(bold && "font-semibold", className)} {...rest}>
      {formatPence(pence)}
    </TD>
  );
}
