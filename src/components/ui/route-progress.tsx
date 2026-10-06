"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Navigation feedback. Render it as a child of a `<Link>` (it must be a descendant, see the Next docs for
 * `useLinkStatus`). While that link is navigating it:
 *  - draws a 2px turmeric bar across the top of the viewport (`.route-bar`, grows over ~8s, never completes
 *    on its own: it unmounts when the new page commits), and
 *  - sets `data-pending="true"` on a layout-free wrapper so the link can dim itself with
 *    `has-[[data-pending=true]]:opacity-70` (AppLink does this for you).
 *
 * Next skips the pending state when the route was prefetched, so the bar only appears when it is needed.
 * It is aria-hidden and takes no space (`display: contents`), so it never shifts a flex or grid layout.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden="true" data-pending={pending ? "true" : "false"} className="contents">
      {pending ? <span className="route-bar" /> : null}
    </span>
  );
}

/** `next/link` plus pending feedback (route bar, and the link dims while it navigates). Same props as Link. */
export function AppLink({ className, children, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link className={cn("has-[[data-pending=true]]:opacity-70", className)} {...rest}>
      {children}
      <LinkPending />
    </Link>
  );
}
