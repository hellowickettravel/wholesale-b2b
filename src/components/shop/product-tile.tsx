"use client";

import { ProductImage } from "@/components/brand/product-image";
import { cn } from "@/lib/cn";
import { useSizeSelection } from "./size-selection";

/**
 * The big tile on the product page. With a photo it is the standard enamel tile (the packshot on its paper
 * mat, the pack size on the lower rim). Without one the plate shows the selected pack size, large: the
 * product name is the page heading right beside it, so it is not repeated on the plate.
 */
export function ProductTile({
  name,
  categorySlug,
  categoryName,
  imageUrl,
  sizes,
  className,
}: {
  name: string;
  categorySlug: string;
  categoryName: string;
  imageUrl: string | null;
  sizes: { id: string; label: string }[];
  className?: string;
}) {
  const selection = useSizeSelection();
  const only = sizes.length === 1 ? sizes[0] : undefined;
  const chosen = sizes.find((s) => s.id === selection?.sizeId) ?? only ?? sizes[0];
  if (imageUrl) {
    return (
      <ProductImage
        src={imageUrl}
        alt={name}
        name={name}
        categorySlug={categorySlug}
        sizeLabel={chosen?.label}
        priority
        sizes="(min-width: 768px) 480px, 100vw"
        className={className}
      />
    );
  }
  return (
    <div data-ground={categorySlug} data-weave="a" className={cn("weave relative grid place-items-center p-4 sm:p-5", className)}>
      <div role="img" aria-label={`${name} (photo coming soon)`} className="plate grid size-full place-items-center px-6 text-center">
        <div>
          {chosen ? (
            <p key={chosen.id} className="text-balance font-display text-[clamp(2.25rem,1.4rem+4vw,3.75rem)] leading-none motion-safe:animate-toast-in">
              {chosen.label}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-ink-muted">{categoryName}</p>
        </div>
      </div>
    </div>
  );
}
