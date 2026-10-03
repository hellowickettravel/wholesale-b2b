import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {icon ? (
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-primary-soft text-primary [&>svg]:size-6" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children ? <div className="mt-1 max-w-sm text-sm text-ink-muted">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
