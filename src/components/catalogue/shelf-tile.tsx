import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Photo, hasStockPhoto } from "@/components/brand/photo";
import { categoryPhotoSlot } from "@/config/photos";
import { cn } from "@/lib/cn";
import { categoryImageUrl } from "@/lib/storage";
import { CategoryArt } from "./category-art";

/** Bundled photos that must not appear on public pages (identifiable people, foreign-language labels). */
const BLOCKED = /\/(whole-spices|pulses-nuts-and-groceries)\.webp$/;

export function shelfCount(n: number) {
  return `${n} ${n === 1 ? "product" : "products"}`;
}

/** A category card: its photo (or colour wash and icon), the name, how many products, and an arrow. */
export function ShelfTile({
  slug,
  name,
  count,
  imagePath,
  href,
  className,
  sizes = "(min-width: 1024px) 280px, 50vw",
}: {
  slug: string;
  name: string;
  count: number;
  imagePath: string | null;
  href: string;
  className?: string;
  sizes?: string;
}) {
  const slot = categoryPhotoSlot(slug);
  const dropped = slot && hasStockPhoto(slot) ? slot : null;
  const url = categoryImageUrl(slug, imagePath);
  const image = url && !BLOCKED.test(url) ? url : null;
  return (
    <Link
      href={href}
      data-ground={slug}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised shadow-rest transition-[box-shadow,transform,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:border-transparent hover:shadow-lift motion-safe:hover:-translate-y-1",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {dropped ? (
          <Photo slot={dropped} className="size-full transition-transform duration-[var(--dur-hero)] ease-[var(--ease-out)] motion-safe:group-hover:scale-[1.04]" sizes={sizes} />
        ) : (
          <CategoryArt slug={slug} imageUrl={image} sizes={sizes} iconClassName="size-12 sm:size-14" className="size-full transition-transform duration-[var(--dur-hero)] ease-[var(--ease-out)] motion-safe:group-hover:scale-[1.04]" />
        )}
      </div>
      <span className="flex flex-1 items-center justify-between gap-3 px-3.5 py-3 sm:px-4">
        <span className="min-w-0">
          <span className="block font-display text-[15px] font-bold leading-snug text-ink sm:text-base">{name}</span>
          {count > 0 ? <span className="tabular mt-0.5 block text-xs text-ink-muted">{shelfCount(count)}</span> : null}
        </span>
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-ink transition-colors duration-[var(--dur-fast)] group-hover:bg-accent group-hover:text-accent-ink">
          <ArrowRight className="size-4" />
        </span>
      </span>
    </Link>
  );
}
