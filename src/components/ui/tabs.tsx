import { cn } from "@/lib/cn";
import { AppLink } from "./route-progress";

/** Link-based tabs (URL is the state, works without JS). Colours fade in 150ms; the active tab is underlined in navy. */
export function LinkTabs({ items, current, label = "Sections" }: { items: { href: string; label: string; count?: number }[]; current: string; label?: string }) {
  return (
    <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label={label}>
      <ul className="flex min-w-max gap-1 border-b border-line">
        {items.map((it) => {
          const active = it.href === current;
          return (
            <li key={it.href}>
              <AppLink
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3.5 text-sm transition-[color,border-color,background-color] duration-[var(--dur-fast)]",
                  active ? "border-primary font-semibold text-ink" : "border-transparent font-medium text-ink-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {it.label}
                {it.count !== undefined ? (
                  <span
                    className={cn(
                      "tabular rounded-[var(--radius-sm)] px-1.5 text-xs font-semibold transition-colors duration-[var(--dur-fast)]",
                      active ? "bg-primary-soft text-primary-strong" : "bg-sunken text-ink-muted",
                    )}
                  >
                    {it.count}
                  </span>
                ) : null}
              </AppLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
