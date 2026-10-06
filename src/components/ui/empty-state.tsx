import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * An empty list as one enamel plate on a kraft panel: a heading, at most two lines, one action.
 * Fits inside a Card or sits on its own. (`icon` is accepted for compatibility and not drawn: the plate is
 * the picture.)
 */
export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  /** Accepted for compatibility; not rendered. */
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid place-items-center rounded-[var(--radius-md)] bg-sunken px-4 py-8 sm:py-10", className)}>
      <div className="plate w-full max-w-[24rem] px-6 pb-7 pt-7 text-center [--rim:var(--hessian)] sm:px-8">
        <h3 className="text-[1.375rem] leading-[1.15] text-ink in-data-[surface=admin]:text-xl in-data-[surface=admin]:font-bold">{title}</h3>
        {children ? <div className="mt-2 text-sm text-ink-muted">{children}</div> : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
