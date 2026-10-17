import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Badge tones carry meaning only (docs/UI-POLISH-PLAN.md 2.3), the same in shop, admin and supplier:
 * neutral = waiting or plain fact, info/primary = in progress, success = done, warning = needs you, danger = a problem.
 * Soft fill, no outline; all text/fill pairs are AA.
 */
export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-muted",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function Badge({ tone = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
