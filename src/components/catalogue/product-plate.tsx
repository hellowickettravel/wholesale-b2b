import { ProductPhoto } from "@/components/brand/product-image";
import { CategoryIcon } from "@/components/catalogue/category-icon";
import { cn } from "@/lib/cn";

/**
 * The big picture at the top of a product page. With a photo it fills a white frame; without one it is the
 * category's colour wash with its icon and name (the product's own name is the heading beside it).
 */
export function ProductPlate({
  src,
  name,
  categoryName,
  categorySlug,
  sizeLabel,
  className,
}: {
  src?: string | null;
  name: string;
  categoryName: string;
  categorySlug: string;
  /** Pack size or range shown on the frame. */
  sizeLabel?: string | null;
  className?: string;
}) {
  return (
    <div data-ground={categorySlug} className={cn("relative grid aspect-square place-items-center overflow-hidden rounded-[var(--radius-xl)] border border-line", src ? "bg-raised" : "weave", className)}>
      {src ? (
        <ProductPhoto src={src} alt={name} priority sizes="(min-width: 768px) 560px, 100vw" width={1100} />
      ) : (
        <span role="img" aria-label={`${name} (photo coming soon)`} className="grid place-items-center gap-4 text-center">
          <span className="mx-auto grid size-28 place-items-center rounded-full bg-raised/85 shadow-[0_0_0_1px_rgb(15_27_45/0.05)]">
            <CategoryIcon slug={categorySlug} className="size-14" strokeWidth={1.5} />
          </span>
          <span className="text-sm font-semibold text-ink-muted">{categoryName}</span>
        </span>
      )}
      {sizeLabel ? <span className="plate-tab !bottom-4 !left-4 !text-sm">{sizeLabel}</span> : null}
    </div>
  );
}
