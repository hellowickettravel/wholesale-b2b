import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const hintTone = { neutral: "text-ink-muted", warning: "text-warning", danger: "text-danger", success: "text-success" };

/**
 * One headline number. The figure is always ink (a page of red and amber numbers is noise); the tone colours
 * the hint line, which says what the number means ("1 overdue"). Pass `href` to make the whole tile a link.
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
    <div className={cn("min-w-0 rounded-[var(--radius-lg)] border border-line bg-raised px-5 py-4", className)}>
      <div className="text-sm font-medium text-ink-muted">{label}</div>
      <div className="tabular mt-1 text-[1.625rem] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[1.75rem]">{value}</div>
      {hint ? <div className={cn("mt-1 text-sm", hintTone[tone])}>{hint}</div> : null}
    </div>
  );
}
