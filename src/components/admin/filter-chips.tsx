import Link from "next/link";
import { cn } from "@/lib/cn";

export interface ChipItem {
  key: string;
  href: string;
  label: string;
  count?: number;
}

/** Status filters as links (the URL is the state): kraft when off, clove when on. */
export function FilterChips({ label, items, current, className }: { label: string; items: ChipItem[]; current: string; className?: string }) {
  return (
    <nav aria-label={label} className={cn("-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1", className)}>
      {items.map((it) => {
        const on = it.key === current;
        return (
          <Link
            key={it.key || "all"}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]",
              on ? "bg-dark text-on-dark" : "bg-sunken text-ink hover:bg-line",
            )}
          >
            {it.label}
            {it.count !== undefined ? <span className={cn("tabular text-xs font-bold", on ? "text-on-dark-muted" : "text-ink-muted")}>{it.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
