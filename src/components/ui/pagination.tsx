import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { AppLink } from "./route-progress";

/** Server-rendered pagination using ?page=. `hrefFor` builds the URL for a page number. 44px targets. */
export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  if (pageCount <= 1) return null;
  const item =
    "inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-md)] border-[1.5px] border-line-strong bg-raised px-4 text-sm font-bold text-ink transition-colors duration-[var(--dur-fast)]";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-6">
      {page > 1 ? (
        <AppLink className={cn(item, "hover:bg-sunken")} href={hrefFor(page - 1)} rel="prev">
          <ChevronLeft className="size-4" aria-hidden="true" /> Previous
        </AppLink>
      ) : (
        <span className={cn(item, "opacity-40")} aria-disabled="true"><ChevronLeft className="size-4" aria-hidden="true" /> Previous</span>
      )}
      <span className="tabular text-sm text-ink-muted">Page {page} of {pageCount}</span>
      {page < pageCount ? (
        <AppLink className={cn(item, "hover:bg-sunken")} href={hrefFor(page + 1)} rel="next">
          Next <ChevronRight className="size-4" aria-hidden="true" />
        </AppLink>
      ) : (
        <span className={cn(item, "opacity-40")} aria-disabled="true">Next <ChevronRight className="size-4" aria-hidden="true" /></span>
      )}
    </nav>
  );
}
