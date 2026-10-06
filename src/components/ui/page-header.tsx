import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Page title block: display-l in the display face, a plain sentence under it, actions on the right.
 * Inside the admin shell (data-surface="admin") the title drops to a working size in Mukta bold.
 * `eyebrow` is accepted so existing callers keep compiling, but it is deliberately not drawn: a small label
 * above a heading says nothing the sidebar and the heading do not already say.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Accepted for compatibility; not rendered. */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between sm:pb-6", className)}>
      <div className="min-w-0">
        <h1 className="text-[clamp(1.875rem,1.4rem+2vw,2.75rem)] leading-[1.1] text-ink in-data-[surface=admin]:text-[clamp(1.625rem,1.3rem+1.3vw,2.125rem)] in-data-[surface=admin]:font-bold in-data-[surface=admin]:leading-tight">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-prose text-base text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
