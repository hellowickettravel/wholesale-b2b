"use client";

import { useEffect, type ReactNode } from "react";
import { Button, LinkButton } from "./button";

/**
 * Error boundary body for a route group (shop, admin, supplier). It renders inside the group's shell, so the
 * navigation stays on screen. Flat and left-aligned: what happened, what to do, and a retry.
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
    <div role="alert" className="max-w-xl py-6 sm:py-10">
      <h1 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">This page did not load</h1>
      <div className="mt-2 text-base text-ink-muted">
        {children ?? <p>Nothing you did caused this, and nothing was lost. Try again, or go back to {homeLabel}.</p>}
        {error.digest ? <p className="tabular mt-3 text-sm">Reference: {error.digest}</p> : null}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <LinkButton href={homeHref} variant="secondary">
          Go to {homeLabel}
        </LinkButton>
      </div>
    </div>
  );
}
