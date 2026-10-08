import { cn } from "@/lib/cn";

/**
 * The Wholesale Street mark: a navy tile with a striped shop awning over a shop front.
 * Pure SVG so it is crisp at 16px (favicon) and 64px (invoice) alike. Colours are the brand hex values
 * (also used by src/app/icon.svg and the invoice PDF); keep them in sync with src/config/brand.ts.
 */
export const MARK_PATHS = {
  tile: "#0B2A5B",
  red: "#D81F26",
  white: "#FFFFFF",
} as const;

export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const { tile, red, white } = MARK_PATHS;
  return (
    <svg viewBox="0 0 32 32" className={cn("shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <rect width="32" height="32" rx="8" fill={tile} />
      {/* awning: four stripes with a scalloped edge */}
      <path d="M6 8.5h5v5.5a2.5 2.5 0 0 1-5 0z" fill={red} />
      <path d="M11 8.5h5v5.5a2.5 2.5 0 0 1-5 0z" fill={white} />
      <path d="M16 8.5h5v5.5a2.5 2.5 0 0 1-5 0z" fill={red} />
      <path d="M21 8.5h5v5.5a2.5 2.5 0 0 1-5 0z" fill={white} />
      <rect x="5.5" y="6.5" width="21" height="2.5" rx="1.25" fill={white} />
      {/* shop front with a door */}
      <path d="M8 18.5h16V25a1 1 0 0 1-1 1h-5.25v-5h-3.5v5H9a1 1 0 0 1-1-1z" fill={white} />
    </svg>
  );
}
