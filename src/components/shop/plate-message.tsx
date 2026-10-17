import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** An announcement: empty lists, nothing found. A short title, one line of copy and at most one action. Flat. */
export function PlateMessage({ title, children, action, className, icon }: { title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <div className={cn("grid place-items-center rounded-[var(--radius-lg)] border border-line bg-raised px-4 py-12 sm:py-14", className)}>
      <div className="w-full max-w-md text-center">
        {icon ? <span aria-hidden="true" className="mx-auto mb-3 grid place-items-center text-ink-subtle [&_svg]:size-6">{icon}</span> : null}
        <h2 className="text-balance text-xl font-semibold leading-tight text-ink">{title}</h2>
        {children ? <p className="mx-auto mt-2 max-w-[40ch] text-ink-muted">{children}</p> : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
