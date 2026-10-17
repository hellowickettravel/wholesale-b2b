import type { ReactNode } from "react";
import { LinkButton } from "./button";

/**
 * 404 body for a route group (shop, admin, supplier). It renders inside the group's shell, so the navigation stays
 * on screen. Used by the segment `not-found.tsx` files (reached by `notFound()` and by the `[...rest]` catch-alls).
 * Flat and left-aligned, like the page it replaces.
 */
export function SegmentNotFound({ homeHref, homeLabel, children, actions }: { homeHref: string; homeLabel: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="max-w-xl py-6 sm:py-10">
      <p className="tabular text-sm font-medium text-ink-muted">Error 404</p>
      <h1 className="mt-1 text-2xl font-semibold leading-tight text-ink sm:text-3xl">We can&apos;t find that page</h1>
      <div className="mt-2 text-base text-ink-muted [&_p+p]:mt-2">{children ?? <p>The link may be old, or the record may have been removed.</p>}</div>
      <div className="mt-6 flex flex-wrap gap-2">
        <LinkButton href={homeHref}>Go to {homeLabel}</LinkButton>
        {actions}
      </div>
    </div>
  );
}
