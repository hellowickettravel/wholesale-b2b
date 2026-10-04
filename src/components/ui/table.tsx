import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Horizontally scrollable on small screens; the page itself never scrolls sideways. */
export function Table({ className, ...rest }: ComponentProps<"table">) {
  return (
    <div className="relative -mx-px max-w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...rest} />
    </div>
  );
}
export function THead({ className, ...rest }: ComponentProps<"thead">) {
  return <thead className={cn("bg-sunken/60 text-left", className)} {...rest} />;
}
export function TH({ className, ...rest }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn("whitespace-nowrap border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted", className)}
      {...rest}
    />
  );
}
export function TR({ className, ...rest }: ComponentProps<"tr">) {
  return <tr className={cn("border-b border-line last:border-0 hover:bg-surface/70", className)} {...rest} />;
}
export function TD({ className, ...rest }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle text-ink", className)} {...rest} />;
}
