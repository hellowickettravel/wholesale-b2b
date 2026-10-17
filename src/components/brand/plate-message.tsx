import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A white card that announces one thing: a waiting state, an error, a page that is not there. One heading,
 * at most two short lines, and the next action. Never holds a form or a table. Flat: a hairline border on the
 * page, no tinted panel behind it. (`ground` is accepted for compatibility and only adds the outer padding.)
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
  /** Small label above the heading, e.g. "Error 404". */
  tab?: string;
  children?: ReactNode;
  actions?: ReactNode;
  ground?: string;
  className?: string;
  plateClassName?: string;
  /** "full" fills its column (inside forms and auth columns); "narrow" is a 28rem card. */
  fit?: "narrow" | "full";
}) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  const plate = (
    <div className={cn("plate mx-auto w-full px-6 py-8 text-center sm:px-8", fit === "narrow" && "max-w-[28rem]", plateClassName)}>
      {tab ? <p className="mb-2 text-sm font-medium text-ink-muted">{tab}</p> : null}
      <Heading className={cn("font-semibold leading-tight text-ink", fit === "full" ? "text-xl" : "text-2xl")}>{title}</Heading>
      {children ? <div className="mx-auto mt-2 max-w-[44ch] text-base text-ink-muted [&_p+p]:mt-2">{children}</div> : null}
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
  return <div className={cn(ground && "px-4 py-10 sm:py-14", className)}>{plate}</div>;
}
