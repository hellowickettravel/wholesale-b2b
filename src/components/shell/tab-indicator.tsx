"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { isActive } from "./nav-link";

/**
 * The turmeric pill behind the active phone tab. The bar has five equal columns, so the pill is one
 * 20%-wide column translated by `index * 100%` of itself: no measuring, no JS in the animation. It is a CSS
 * transform transition on purpose (not a shared-layout animation): it keeps moving on the compositor while
 * React renders the next page, and it costs no animation library on shop routes. `usePathname` is available
 * during SSR, so the pill is already in the right place in the first HTML and only moves on a change.
 * Styles: `.tab-indicator` in globals.css. Props are serialisable on purpose (icons stay in the server shell).
 */
export function TabIndicator({ items }: { items: { href: string; exact?: boolean }[] }) {
  const pathname = usePathname();
  const i = items.findIndex((it) => isActive(pathname, it.href, it.exact));
  return <span aria-hidden="true" className="tab-indicator" data-on={i >= 0 ? "" : undefined} style={{ "--i": Math.max(i, 0) } as CSSProperties} />;
}
