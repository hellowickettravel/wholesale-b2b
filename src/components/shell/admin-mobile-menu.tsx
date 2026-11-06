"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { isActive } from "./nav-link";

/**
 * Phone and tablet admin menu: a "Menu" button showing the current section, opening the full grouped list
 * (the same groups as the desktop sidebar). Replaces a sideways-scrolling strip in which most sections,
 * Products included, sat off-screen with no hint that they were there.
 * The links are rendered on the server and passed in as children; this only owns open/closed.
 */
export function AdminMobileMenu({
  items,
  attention,
  children,
}: {
  items: { href: string; label: string; exact?: boolean }[];
  /** Total of the badges, shown on the closed button so waiting work is not hidden. */
  attention: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const current = items.find((i) => isActive(pathname, i.href, i.exact))?.label ?? "Menu";
  const [lastPath, setLastPath] = useState(pathname);

  // Close after navigating (adjusting state during render, not in an effect).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="px-3 pb-2.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-md)] bg-white/10 px-3 text-left text-sm font-semibold text-on-dark transition-colors duration-[var(--dur-fast)] hover:bg-white/15"
      >
        {open ? <X className="size-5 shrink-0" aria-hidden="true" /> : <Menu className="size-5 shrink-0" aria-hidden="true" />}
        <span className="flex-1 truncate">
          <span className="sr-only">Menu, current section: </span>
          {current}
        </span>
        {!open && attention ? (
          <span className="tabular min-w-5 rounded-[var(--radius-sm)] bg-accent px-1.5 text-center text-xs font-bold text-accent-ink">{attention}</span>
        ) : null}
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-on-dark-muted">{open ? "Close" : "Menu"}</span>
      </button>
      <div id={panelId} hidden={!open} className="mt-2 max-h-[calc(100dvh-8rem)] overflow-y-auto pb-1">
        {children}
      </div>
    </div>
  );
}
