"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Replays the `bump` keyframe (1 to 1.3 to 1 on the spring curve, 380ms) each time `value` changes after the
 * first render. A plain page load stays still. Reduced motion is handled by the global rule.
 *
 *   <BumpOnChange value={count}><span className="badge">{count}</span></BumpOnChange>
 *
 * The wrapper is an inline-block span; pass className to position it. (BasketBadge has this behaviour built in.)
 */
export function BumpOnChange({ value, children, className }: { value: string | number; children: ReactNode; className?: string }) {
  const [seen, setSeen] = useState(value);
  const [bumps, setBumps] = useState(0);
  if (seen !== value) {
    setSeen(value);
    setBumps((n) => n + 1);
  }
  return (
    <span key={bumps} className={cn("inline-block", bumps > 0 && "motion-safe:animate-bump", className)}>
      {children}
    </span>
  );
}
