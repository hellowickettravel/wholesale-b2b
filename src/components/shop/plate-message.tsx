import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * An announcement on an enamel plate: empty lists, nothing found. One plate, a short title, one line of
 * copy and at most one action. The ground behind it is the neutral jute (empty states are not a shelf).
 */
export function PlateMessage({ title, children, action, className }: { title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div data-ground="" data-weave="a" className={cn("weave grid place-items-center rounded-[var(--radius-xl)] px-4 py-10 sm:py-14", className)}>
      <div className="plate w-full max-w-md px-6 py-7 text-center sm:px-8 sm:py-8">
        <h2 className="text-balance text-2xl leading-tight text-ink sm:text-[1.75rem]">{title}</h2>
        {children ? <p className="mx-auto mt-2 max-w-[34ch] text-ink-muted">{children}</p> : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
