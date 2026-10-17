"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Phone only: the filter fields fold behind one "Filters" button so the list starts on the first screen.
 * From `sm` up the fields are always shown and the button is hidden.
 */
export function FilterFields({ active, children }: { active: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-line-control bg-raised px-3.5 text-sm font-medium text-ink sm:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-ink-muted" aria-hidden="true" />
          Filters
          {active ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-ink">On</span> : null}
        </span>
        <ChevronDown className={cn("size-4 text-ink-muted transition-transform duration-[var(--dur-fast)]", open && "rotate-180")} aria-hidden="true" />
      </button>
      <div className={cn("contents", !open && "max-sm:hidden")}>{children}</div>
    </>
  );
}
