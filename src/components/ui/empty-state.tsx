import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * An empty list: a heading, at most two lines, one action. Flat (no panel, no card): it sits inside the Card or
 * page that holds the list. (`icon` is accepted for compatibility and not drawn.)
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
    <div className={cn("mx-auto max-w-md px-4 py-10 text-center sm:py-12", className)}>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {children ? <div className="mt-1.5 text-sm text-ink-muted [&_p+p]:mt-1.5">{children}</div> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
