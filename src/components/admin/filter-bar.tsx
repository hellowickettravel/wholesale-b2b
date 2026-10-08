import type { ReactNode } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/**
 * The filter row above an admin list: a plain GET form, so the URL is the state (shareable, back button works,
 * no JavaScript needed). Put <FilterSearch>, <FilterSelect> and <FilterDates> inside; `hidden` carries params
 * that are set elsewhere (the status chips). "Clear" appears when any filter is on.
 */
export function FilterBar({
  action,
  hidden = {},
  clearHref,
  active,
  children,
  className,
}: {
  action: string;
  hidden?: Record<string, string | undefined>;
  clearHref: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form action={action} className={cn("mb-4 flex flex-wrap items-end gap-x-2.5 gap-y-3 rounded-[var(--radius-lg)] border border-line bg-raised p-3 shadow-rest", className)}>
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {children}
      <div className="flex gap-2 max-sm:w-full">
        <button type="submit" className={buttonClasses({ size: "sm", className: "h-11 max-sm:flex-1" })}>
          <SlidersHorizontal className="size-4" aria-hidden="true" /> Apply
        </button>
        {active ? (
          <Link href={clearHref} className={buttonClasses({ variant: "ghost", size: "sm", className: "h-11" })}>
            <X className="size-4" aria-hidden="true" /> Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export function FilterSearch({ id, name = "q", defaultValue, placeholder, label }: { id: string; name?: string; defaultValue?: string; placeholder: string; label: string }) {
  return (
    <div className="min-w-0 flex-[1_1_16rem]">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-muted">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
        <Input id={id} name={name} type="search" defaultValue={defaultValue} placeholder={placeholder} className="pl-9" />
      </div>
    </div>
  );
}

export function FilterSelect({
  id,
  name,
  label,
  defaultValue,
  options,
  className,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  options: readonly { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 flex-[1_1_10rem] sm:max-w-[14rem]", className)}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-muted">{label}</label>
      <Select id={id} name={name} defaultValue={defaultValue}>
        {options.map((o) => (
          <option key={o.value || "any"} value={o.value}>{o.label}</option>
        ))}
      </Select>
    </div>
  );
}

/** "From" and "To" date inputs (ISO yyyy-mm-dd, both optional). */
export function FilterDates({ idPrefix, label, from, to }: { idPrefix: string; label: string; from?: string; to?: string }) {
  return (
    <fieldset className="flex min-w-0 flex-[1_1_18rem] gap-2 sm:max-w-[22rem]">
      <legend className="sr-only">{label}</legend>
      <div className="min-w-0 flex-1">
        <label htmlFor={`${idPrefix}-from`} className="mb-1 block text-xs font-semibold text-ink-muted">{label} from</label>
        <Input id={`${idPrefix}-from`} name="from" type="date" defaultValue={from} />
      </div>
      <div className="min-w-0 flex-1">
        <label htmlFor={`${idPrefix}-to`} className="mb-1 block text-xs font-semibold text-ink-muted">{label} to</label>
        <Input id={`${idPrefix}-to`} name="to" type="date" defaultValue={to} />
      </div>
    </fieldset>
  );
}
