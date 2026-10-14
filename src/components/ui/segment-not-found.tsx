import type { ReactNode } from "react";
import { LinkButton } from "./button";

/**
 * 404 body for a route group (shop, admin, supplier). It renders inside the group's shell, so the navigation stays
 * on screen. Used by the segment `not-found.tsx` files (reached by `notFound()` and by the `[...rest]` catch-alls).
 */
export function SegmentNotFound({ homeHref, homeLabel, children }: { homeHref: string; homeLabel: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-[var(--radius-xl)] bg-sunken px-4 py-12 sm:py-16">
      <div className="plate w-full max-w-[26rem] px-6 pb-8 pt-8 text-center sm:px-9 sm:pb-10 sm:pt-10">
        <p className="tabular text-sm font-semibold text-ink-muted">404</p>
        <h1 className="mt-1 text-[clamp(1.5rem,1.15rem+1.5vw,2.125rem)] leading-[1.1] text-ink in-data-[surface=admin]:font-bold">We can&apos;t find that page</h1>
        <div className="mt-3 text-base text-ink-muted">{children ?? <p>The link may be old, or the record may have been removed.</p>}</div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LinkButton href={homeHref}>Go to {homeLabel}</LinkButton>
        </div>
      </div>
    </div>
  );
}
