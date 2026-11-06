import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Page heading for the restaurant area: the display face, an optional plain sentence under it. */
export function ShopTitle({ children, description, action, className }: { children: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between sm:pb-6", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl text-ink">{children}</h1>
        {description ? <p className="mt-2 max-w-prose text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}
