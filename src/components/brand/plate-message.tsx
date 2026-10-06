import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * An enamel plate that announces one thing: an empty list, a waiting state, an error. One heading,
 * at most two short lines, and the next action. Never holds a form or a table.
 *
 * With `ground` (a category slug, or "default") the plate sits on a shelf-colour panel; without it the
 * caller supplies the ground (the status pages do) or the plate sits straight on the page.
 */
export function PlateMessage({
  title,
  headingLevel = 2,
  tab,
  children,
  actions,
  ground,
  className,
  plateClassName,
  fit = "narrow",
}: {
  title: ReactNode;
  headingLevel?: 1 | 2 | 3;
  /** Small label on the plate's lower rim, e.g. "404". */
  tab?: string;
  children?: ReactNode;
  actions?: ReactNode;
  ground?: string;
  className?: string;
  plateClassName?: string;
  /** "full" fills its column (inside forms and auth columns); "narrow" is a 26rem sign. */
  fit?: "narrow" | "full";
}) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  const plate = (
    <div className={cn("plate mx-auto w-full px-6 pt-8 text-center sm:px-9 sm:pt-10", fit === "narrow" && "max-w-[26rem]", tab ? "pb-11" : "pb-8 sm:pb-10", plateClassName)}>
      <Heading className="text-[clamp(1.5rem,1.15rem+1.5vw,2.125rem)] leading-[1.1] text-ink">{title}</Heading>
      {children ? <div className="mt-3 text-base text-ink-muted [&_p+p]:mt-2">{children}</div> : null}
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
      {tab ? <span className="plate-tab">{tab}</span> : null}
    </div>
  );
  if (!ground) return <div className={className}>{plate}</div>;
  return (
    <div data-ground={ground} className={cn("weave px-4 py-10 sm:px-8 sm:py-14", className)}>
      {plate}
    </div>
  );
}
