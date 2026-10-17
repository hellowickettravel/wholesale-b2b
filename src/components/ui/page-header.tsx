import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { AppLink } from "./route-progress";

/**
 * Page title block, the same everywhere: an optional back link, the title (24px phone / 28px desktop) with
 * optional badges beside it (`meta`), a plain sentence under it, and actions on the right.
 * `eyebrow` is accepted so existing callers keep compiling, but it is deliberately not drawn.
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Accepted for compatibility; not rendered. */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /** A link back to the parent list, drawn above the title. */
  back?: { href: string; label: string };
  /** Status badges shown beside the title. */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("pb-6", className)}>
      {back ? (
        <AppLink href={back.href} className="mb-3 inline-flex min-h-8 items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" /> {back.label}
        </AppLink>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
            {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
          </div>
          {description ? <p className="mt-1.5 max-w-prose text-base text-ink-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
