"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Basket count in a chilli badge, at least 20px. It bumps (one 280ms pulse to 1.18, no overshoot) whenever the
 * count changes after the first render, so adding an item is felt in the nav; a plain page load is still.
 */
export function BasketBadge({ count, className }: { count: number; className?: string }) {
  const [seen, setSeen] = useState(count);
  const [bumps, setBumps] = useState(0);
  if (seen !== count) {
    setSeen(count);
    setBumps((n) => n + 1);
  }
  if (count <= 0) return null;
  return (
    <span
      key={bumps}
      className={cn(
        "tabular inline-grid h-5 min-w-5 place-items-center rounded-full bg-mark px-1.5 text-xs font-bold leading-none text-primary-ink",
        bumps > 0 && "motion-safe:animate-bump",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
