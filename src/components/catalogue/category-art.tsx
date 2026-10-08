import { ProductPhoto } from "@/components/brand/product-image";
import { cn } from "@/lib/cn";
import { CategoryIcon } from "./category-icon";

/**
 * Category visual: the category photo when there is one, otherwise the category's colour wash with its icon.
 * Purely decorative: the category name is always shown next to it.
 */
export function CategoryArt({
  slug,
  imageUrl,
  className,
  iconClassName = "size-1/2",
  sizes = "(min-width: 1024px) 280px, 50vw",
}: {
  slug: string;
  imageUrl?: string | null;
  className?: string;
  iconClassName?: string;
  sizes?: string;
}) {
  return (
    <div aria-hidden="true" data-ground={slug} className={cn("relative grid place-items-center overflow-hidden", imageUrl ? "bg-sunken" : "weave", className)}>
      {imageUrl ? <ProductPhoto src={imageUrl} alt="" sizes={sizes} width={600} className="!object-cover !p-0" /> : <CategoryIcon slug={slug} className={iconClassName} />}
    </div>
  );
}
