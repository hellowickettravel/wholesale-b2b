import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A flat white surface with a hairline border. `overflow-clip` keeps a table header or a full-bleed row inside
 * the rounded corners without creating a scroll container (so sticky children still stick).
 */
export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("min-w-0 overflow-clip rounded-[var(--radius-lg)] border border-line bg-raised", className)} {...rest} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-snug text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...rest} />;
}
