"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/cn";

/**
 * While `el` is docked (position: fixed) and `active`, publish its height as `--dock-h` on <html>, so the toast
 * (and anything else that floats at the bottom) sits above it instead of covering it.
 */
export function useDockOffset(el: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const node = el.current;
    const root = document.documentElement;
    if (!node || !active) return;
    const update = () => {
      const fixed = getComputedStyle(node).position === "fixed";
      root.style.setProperty("--dock-h", fixed ? `${node.offsetHeight}px` : "0px");
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty("--dock-h");
    };
  }, [el, active]);
}

/**
 * The bar that keeps a screen's main action in reach: unsaved changes + Save, an import's "Import 58 products",
 * a basket total + Checkout. Fixed to the bottom of the viewport, safe-area aware, slides in when `show` turns on.
 * `aboveTabBar` lifts it over the shop's phone tab bar; `sidebar` leaves room for the admin sidebar on desktop.
 */
export function StickyActionBar({
  show,
  aboveTabBar,
  sidebar,
  className,
  children,
}: {
  show: boolean;
  aboveTabBar?: boolean;
  sidebar?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDockOffset(ref, show);
  return (
    <div
      ref={ref}
      aria-hidden={!show}
      className={cn(
        "fixed inset-x-0 z-30 border-t border-line bg-raised/95 px-4 py-3 shadow-pop backdrop-blur-md transition-[transform,visibility] ease-[var(--ease-out)]",
        aboveTabBar ? "bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0" : "bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        sidebar && "lg:left-[248px]",
        // `visibility` interpolates, so the bar stays visible for its whole exit and flips hidden at the end.
        show ? "translate-y-0 duration-200" : "invisible translate-y-[calc(100%+5rem)] duration-150",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">{children}</div>
    </div>
  );
}
