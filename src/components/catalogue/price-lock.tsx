import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";

/** Shown wherever a price would be. Public pages never receive a price to show. */
export function PriceLock({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-accent-soft px-2 py-1 text-[11px] font-semibold text-accent-ink sm:gap-1.5 sm:px-2.5 sm:text-xs", className)}>
      <Lock className="size-3 shrink-0" aria-hidden="true" />
      <span className="sm:hidden">Register for price</span>
      <span className="hidden sm:inline">Register to see price</span>
    </span>
  );
}
