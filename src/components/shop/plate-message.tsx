import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { cn } from "@/lib/cn";

/** An announcement: empty lists, nothing found. A short title, one line of copy and at most one action. */
export function PlateMessage({ title, children, action, className, icon }: { title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <div className={cn("grid place-items-center rounded-[var(--radius-xl)] border border-dashed border-line-strong/40 bg-raised px-4 py-12 sm:py-16", className)}>
      <div className="w-full max-w-md text-center">
        <span aria-hidden="true" className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
          {icon ?? <SearchX className="size-6" />}
        </span>
        <h2 className="text-balance text-xl leading-tight text-ink sm:text-2xl">{title}</h2>
        {children ? <p className="mx-auto mt-2 max-w-[40ch] text-ink-muted">{children}</p> : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
