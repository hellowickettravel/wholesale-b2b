import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const valueTone = { neutral: "text-ink", warning: "text-warning", danger: "text-danger", success: "text-success" };

/**
 * One headline number. No gradient, no accent bar: the figure is big and tabular, and the tone shows in
 * its colour (chilli, cumin gold, leaf: all AA on enamel) with the hint line saying what it means.
 */
export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "warning" | "danger" | "success";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-[var(--radius-lg)] border border-line bg-raised px-5 py-4 shadow-rest", className)}>
      <div className="text-sm font-semibold text-ink-muted">{label}</div>
      <div className={cn("tabular mt-1 font-sans text-[1.75rem] font-bold leading-tight sm:text-[2rem]", valueTone[tone])}>{value}</div>
      {hint ? <div className="mt-1.5 text-sm text-ink-muted">{hint}</div> : null}
    </div>
  );
}
