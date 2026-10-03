import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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
  const bar = { neutral: "bg-line-strong", warning: "bg-warning", danger: "bg-danger", success: "bg-success" }[tone];
  return (
    <div className={cn("relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised px-5 py-4", className)}>
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", bar)} />
      <div className="text-[13px] font-medium text-ink-muted">{label}</div>
      <div className="tabular mt-1 font-display text-2xl font-bold text-ink">{value}</div>
      {hint ? <div className="mt-1 text-[13px] text-ink-muted">{hint}</div> : null}
    </div>
  );
}
