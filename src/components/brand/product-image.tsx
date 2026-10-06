import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Same twill direction for the same product on every page, different between neighbours. */
function weaveFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 2 === 0 ? "a" : "b";
}

/**
 * A product, always shown as a thing in a frame: a shelf-coloured tile (by category) holding a cream
 * enamel plate. With a packshot the plate carries the photo on a paper mat; without one it carries the
 * product name and the size on its lower rim, so a grid of mixed photo and no-photo items still reads
 * as one shop. When real food photography arrives it replaces the plate contents; the frame stays.
 *
 * Variants: "tile" (cards, product pages; size it with className, default square) and "thumb"
 * (rows, basket: a small plate showing the pack size).
 */
export function ProductImage({
  src,
  alt,
  name,
  categorySlug,
  sizeLabel,
  variant = "tile",
  className,
  sizes = "(min-width: 1024px) 240px, 45vw",
  priority,
  fallback,
}: {
  src?: string | null;
  alt: string;
  name: string;
  categorySlug?: string;
  /** Pack size shown on the plate's lower rim (tile) or in the plate (thumb), e.g. "20 kg". */
  sizeLabel?: string;
  variant?: "tile" | "thumb";
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Escape hatch: rendered instead of the no-photo plate. */
  fallback?: ReactNode;
}) {
  if (!src && fallback) return <>{fallback}</>;

  if (variant === "thumb") {
    return (
      <div data-ground={categorySlug} className={cn("weave relative grid shrink-0 place-items-center overflow-hidden p-1.5", className)} data-weave={weaveFor(name)}>
        <div className="plate plate-sm grid size-full place-items-center overflow-hidden">
          {src ? (
            <div className="plate-photo absolute inset-[3px] rounded-[5px]">
              <Image src={src} alt={alt} fill sizes={sizes} className="object-contain p-0.5" />
            </div>
          ) : (
            <span role="img" aria-label={`${name} (photo coming soon)`} className="px-0.5 text-center font-display text-[13px] leading-none">
              {sizeLabel ?? name.charAt(0)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-ground={categorySlug} data-weave={weaveFor(name)} className={cn("weave relative grid aspect-square place-items-center p-[14px] sm:p-4", className)}>
      <div className="plate relative grid size-full place-items-center">
        {src ? (
          <div className="plate-photo absolute inset-[5px] rounded-[8px]">
            <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-contain" />
          </div>
        ) : (
          <span
            role="img"
            aria-label={`${name} (photo coming soon)`}
            className="line-clamp-4 max-w-[88%] text-balance break-words text-center font-display text-[17px] leading-[1.1] sm:text-[21px]"
          >
            {name}
          </span>
        )}
        {sizeLabel ? <span className="plate-tab">{sizeLabel}</span> : null}
      </div>
    </div>
  );
}
