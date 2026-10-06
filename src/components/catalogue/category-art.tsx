import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Category visual: a shelf-coloured ground with a hessian twill (one colour per category, see
 * [data-ground] in globals.css), or the category photo inside a ground-coloured frame when one is
 * uploaded. Purely decorative: the category name is always shown next to it.
 */
export function CategoryArt({
  slug,
  imageUrl,
  className,
  sizes = "(min-width: 1024px) 280px, 50vw",
}: {
  slug: string;
  imageUrl?: string | null;
  className?: string;
  /** Kept for existing callers; the new shelf tiles carry no icon. */
  iconClassName?: string;
  sizes?: string;
}) {
  if (imageUrl) {
    return (
      <div aria-hidden="true" data-ground={slug} className={cn("weave relative overflow-hidden p-[7px]", className)}>
        <div className="relative size-full overflow-hidden rounded-[8px] bg-sunken">
          <Image src={imageUrl} alt="" fill sizes={sizes} className="object-cover" />
        </div>
      </div>
    );
  }
  return <div aria-hidden="true" data-ground={slug} className={cn("weave relative overflow-hidden", className)} />;
}
