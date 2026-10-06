import { cn } from "@/lib/cn";

/**
 * Pending indicator. It fades in after 150ms (see `.spinner` in globals.css) so a fast action never
 * flashes it, and it keeps turning slowly under reduced motion because it is feedback, not decoration.
 */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? "status" : undefined} className="spinner inline-flex items-center">
      <svg className={cn(className ?? "size-5")} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

/** One kraft block. Size it with className; it copies the real element's radius when you pass one. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton rounded-[var(--radius-sm)]", className)} />;
}
