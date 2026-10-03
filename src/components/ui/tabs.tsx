import Link from "next/link";
import { cn } from "@/lib/cn";

/** Link-based tabs (URL is the state, works without JS). */
export function LinkTabs({ items, current }: { items: { href: string; label: string; count?: number }[]; current: string }) {
  return (
    <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Sections">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {items.map((it) => {
          const active = it.href === current;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium",
                  active ? "border-primary text-ink" : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {it.label}
                {it.count !== undefined ? (
                  <span className={cn("tabular rounded-full px-1.5 text-xs", active ? "bg-primary-soft text-primary-strong" : "bg-sunken")}>{it.count}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
