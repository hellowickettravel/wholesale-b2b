import Image from "next/image";
import type { ReactNode } from "react";
import { CategoryIcon } from "@/components/catalogue/category-icon";
import { cn } from "@/lib/cn";
import { isStockPhoto, stockPhotoSrc } from "@/lib/storage";

/**
 * The picture inside a product frame. A stock photograph (a scene) fills the frame; a packshot (cut-out pack
 * on white) is contained with breathing room. `width` is the largest CSS width the frame is drawn at.
 */
export function ProductPhoto({ src, alt, sizes, width = 600, priority, className }: { src: string; alt: string; sizes: string; width?: number; priority?: boolean; className?: string }) {
  if (isStockPhoto(src)) {
    return <Image src={stockPhotoSrc(src, width)} alt={alt} fill unoptimized sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-contain p-[8%]", className)} />;
}

/**
 * A product picture in a frame: the photo when there is one, otherwise a soft wash of the category colour with
 * the category's icon (and the pack size), so a grid of mixed photo and no-photo items still reads as one shop.
 *
 * Variants: "tile" (cards, product pages; size it with className, default square) and "thumb" (rows, basket).
 */
export function ProductImage({
  src,
  alt,
  name,
  categorySlug,
  sizeLabel,
  variant = "tile",
  className,
  sizes = "(min-width: 1024px) 280px, 46vw",
  priority,
  fallback,
}: {
  src?: string | null;
  alt: string;
  name: string;
  categorySlug?: string;
  /** Pack size shown on the tile, e.g. "20 kg". */
  sizeLabel?: string;
  variant?: "tile" | "thumb";
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Escape hatch: rendered instead of the no-photo tile. */
  fallback?: ReactNode;
}) {
  if (!src && fallback) return <>{fallback}</>;

  if (variant === "thumb") {
    return (
      <div data-ground={categorySlug} className={cn("relative grid shrink-0 place-items-center overflow-hidden border border-line", src ? "bg-raised" : "weave", className)}>
        {src ? (
          <ProductPhoto src={src} alt={alt} sizes={sizes} width={160} />
        ) : (
          <span role="img" aria-label={alt ? `${name} (photo coming soon)` : undefined} aria-hidden={alt ? undefined : true}>
            <CategoryIcon slug={categorySlug} className="size-[42%] min-h-5 min-w-5" />
          </span>
        )}
      </div>
    );
  }

  return (
    <div data-ground={categorySlug} className={cn("relative grid aspect-square place-items-center overflow-hidden", src ? "bg-raised" : "weave", className)}>
      {src ? (
        <ProductPhoto src={src} alt={alt} sizes={sizes} priority={priority} className="transition-transform duration-[var(--dur-hero)] ease-[var(--ease-out)] motion-safe:group-hover:scale-[1.04]" />
      ) : (
        <span role="img" aria-label={`${name} (photo coming soon)`} className="grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full bg-raised/80 shadow-[0_0_0_1px_rgb(15_27_45/0.05)] sm:size-20">
            <CategoryIcon slug={categorySlug} className="size-8 sm:size-10" />
          </span>
        </span>
      )}
      {sizeLabel ? <span className="plate-tab">{sizeLabel}</span> : null}
    </div>
  );
}
