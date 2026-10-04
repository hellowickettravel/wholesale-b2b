"use client";

import { Minus, Plus } from "lucide-react";
import { MAX_LINE_QTY } from "@/domain/order";
import { cn } from "@/lib/cn";

/** − [qty] + with a typed value. Calls onChange with whole numbers from `min` to 9,999. */
export function QtyStepper({
  value,
  onChange,
  label,
  min = 1,
  disabled,
  className,
}: {
  value: number;
  onChange: (qty: number) => void;
  label: string;
  min?: number;
  disabled?: boolean;
  className?: string;
}) {
  const set = (n: number) => onChange(Math.max(min, Math.min(MAX_LINE_QTY, n)));
  const btn =
    "grid size-10 shrink-0 place-items-center text-ink-muted hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-40 sm:size-9";
  return (
    <div className={cn("inline-flex h-10 items-center overflow-hidden rounded-[var(--radius-md)] border border-line-strong bg-raised sm:h-9", className)}>
      <button type="button" className={btn} onClick={() => set(value - 1)} disabled={disabled || value <= min} aria-label={`One less: ${label}`}>
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
          set(digits === "" ? min : Number(digits));
        }}
        onFocus={(e) => e.target.select()}
        className="tabular h-full w-12 border-x border-line bg-transparent text-center text-[15px] font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
      />
      <button type="button" className={btn} onClick={() => set(value + 1)} disabled={disabled || value >= MAX_LINE_QTY} aria-label={`One more: ${label}`}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
