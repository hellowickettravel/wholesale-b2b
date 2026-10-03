import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Server-rendered pagination using ?page=. `hrefFor` builds the URL for a page number. */
export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  if (pageCount <= 1) return null;
  const item = "inline-flex h-9 items-center gap-1 rounded-[var(--radius-md)] border border-line-strong bg-raised px-3 text-sm font-medium";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-6">
      {page > 1 ? (
        <Link className={cn(item, "hover:bg-sunken")} href={hrefFor(page - 1)} rel="prev">
          <ChevronLeft className="size-4" aria-hidden="true" /> Previous
        </Link>
      ) : (
        <span className={cn(item, "opacity-40")} aria-disabled="true"><ChevronLeft className="size-4" aria-hidden="true" /> Previous</span>
      )}
      <span className="tabular text-sm text-ink-muted">Page {page} of {pageCount}</span>
      {page < pageCount ? (
        <Link className={cn(item, "hover:bg-sunken")} href={hrefFor(page + 1)} rel="next">
          Next <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className={cn(item, "opacity-40")} aria-disabled="true">Next <ChevronRight className="size-4" aria-hidden="true" /></span>
      )}
    </nav>
  );
}
