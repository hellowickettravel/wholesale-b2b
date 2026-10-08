import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";

/** Quiet marker wherever a price would be on a card. Public pages never receive a price to show. */
export function PriceLock({ className }: { className?: string }) {
  return (
    <span className={cn("block", className)}>
      <span className="flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-primary-soft text-[13px] font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-ink">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        Register to see price
      </span>
    </span>
  );
}

/** The one place a page explains prices: a turmeric-mist strip, shown once per page, not per card. */
export function PriceLockStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-[var(--radius-md)] bg-accent-soft px-4 py-3 text-ink", className)}>
      <Lock className="mt-1 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 text-[15px] leading-snug">{children}</div>
    </div>
  );
}
