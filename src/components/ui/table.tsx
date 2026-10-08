import type { ComponentProps } from "react";
import { formatPence, type Pence } from "@/domain/money";
import { cn } from "@/lib/cn";

/**
 * Data table. The wrapper scrolls sideways on small screens (and contains its own overscroll), so the page
 * itself never scrolls sideways. Kraft header row in sentence case, hairline rows, hover tint on pointer devices.
 * Numbers and money: pass `numeric` to TH and TD (right-aligned, tabular), or use <MoneyTD pence={...} />.
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
      className={cn("whitespace-nowrap border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted", numeric ? "text-right" : "text-left", className)}
      {...rest}
    />
  );
}
export function TR({ className, ...rest }: ComponentProps<"tr">) {
  return <tr className={cn("border-b border-line transition-colors duration-[var(--dur-fast)] last:border-0 hover:bg-primary-soft/40", className)} {...rest} />;
}
export function TD({ className, numeric, ...rest }: ComponentProps<"td"> & { numeric?: boolean }) {
  return <td className={cn("px-4 py-3 align-middle text-ink", numeric && "tabular whitespace-nowrap text-right", className)} {...rest} />;
}
/** A right-aligned money cell. `bold` for totals and balances. */
export function MoneyTD({ pence, bold, className, ...rest }: Omit<ComponentProps<"td">, "children"> & { pence: Pence; bold?: boolean }) {
  return (
    <TD numeric className={cn(bold && "font-bold", className)} {...rest}>
      {formatPence(pence)}
    </TD>
  );
}
