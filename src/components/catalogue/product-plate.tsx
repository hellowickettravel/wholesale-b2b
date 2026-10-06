import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * The big tile at the top of a product page: the shelf colour with a plate. With a packshot the plate
 * carries the photo on its paper mat; without one it names the shelf and the pack sizes (the product's
 * own name is the heading beside it, so it is not repeated here).
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
  /** Pack size or range for the plate's lower rim. */
  sizeLabel?: string | null;
  className?: string;
}) {
  return (
    <div data-ground={categorySlug} className={cn("weave relative rounded-[var(--radius-xl)] p-5 sm:p-8", className)}>
      <div className="plate relative grid h-full min-h-[200px] place-items-center sm:min-h-[260px]">
        {src ? (
          <div className="plate-photo absolute inset-[5px] rounded-[8px]">
            <Image src={src} alt={name} fill priority sizes="(min-width: 768px) 520px, 100vw" className="object-contain" />
          </div>
        ) : (
          <span role="img" aria-label={`${name} (photo coming soon)`} className="max-w-[85%] text-balance px-2 text-center font-display text-[clamp(1.75rem,1.2rem+2.4vw,2.75rem)] leading-[1.05] text-ink">
            {categoryName}
          </span>
        )}
        {sizeLabel ? <span className="plate-tab text-sm">{sizeLabel}</span> : null}
      </div>
    </div>
  );
}
