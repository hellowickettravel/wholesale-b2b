"use client";

import { useEffect, type ReactNode } from "react";
import { Button, LinkButton } from "./button";

/**
 * Error boundary body for a route group (shop, admin, supplier). It renders inside the group's shell, so the
 * navigation stays on screen. One enamel plate on a kraft panel: what happened, what to do, and a retry.
 * Used by the segment `error.tsx` files; Next 16 passes `{ error, retry }`.
 */
export function SegmentError({
  error,
  retry,
  homeHref,
  homeLabel,
  children,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref: string;
  homeLabel: string;
  children?: ReactNode;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid place-items-center rounded-[var(--radius-xl)] bg-sunken px-4 py-12 sm:py-16">
      <div role="alert" className="plate w-full max-w-[26rem] px-6 pb-8 pt-8 text-center [--rim:var(--danger)] sm:px-9 sm:pb-10 sm:pt-10">
        <h1 className="text-[clamp(1.5rem,1.15rem+1.5vw,2.125rem)] leading-[1.1] text-ink in-data-[surface=admin]:font-bold">This page did not load</h1>
        <div className="mt-3 text-base text-ink-muted">
          {children ?? <p>Nothing you did caused this, and nothing was lost. Try again, or go back to {homeLabel}.</p>}
          {error.digest ? <p className="tabular mt-3 text-sm">Reference: {error.digest}</p> : null}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => retry()}>Try again</Button>
          <LinkButton href={homeHref} variant="secondary">
            Go to {homeLabel}
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
