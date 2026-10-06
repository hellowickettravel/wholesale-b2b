import Image from "next/image";
import Link from "next/link";
import { Photo, hasStockPhoto } from "@/components/brand/photo";
import { categoryPhotoSlot, getSlot } from "@/config/photos";
import { cn } from "@/lib/cn";
import { publicImageUrl } from "@/lib/storage";

/** Photos that must not appear on public pages (identifiable people, foreign-language labels). */
const BLOCKED = /\/(whole-spices|pulses-nuts-and-groceries)\.webp$/;

/** Same twill direction for the same shelf every time, different between neighbours. */
function weaveFor(slug: string) {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 2 === 0 ? "a" : "b";
}

/** The photo to show on a shelf tile, if there is a usable one: a dropped-in stock file, an admin upload, or the bundled one. */
function shelfPhoto(slug: string, imagePath: string | null): { kind: "slot"; id: NonNullable<ReturnType<typeof categoryPhotoSlot>> } | { kind: "url"; url: string } | null {
  const slot = categoryPhotoSlot(slug);
  if (slot && hasStockPhoto(slot)) return { kind: "slot", id: slot };
  const uploaded = publicImageUrl(imagePath);
  if (uploaded && !BLOCKED.test(uploaded)) return { kind: "url", url: uploaded };
  if (slot && getSlot(slot).bundled) return { kind: "slot", id: slot };
  return null;
}

export function shelfCount(n: number) {
  return `${n} ${n === 1 ? "product" : "products"}`;
}

/**
 * One shelf of the shop: its colour, a hessian twill (or the shelf photo in a coloured frame) and a
 * label plate with the shelf name and how many lines are on it.
 */
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
  const photo = shelfPhoto(slug, imagePath);
  return (
    <Link
      href={href}
      data-ground={slug}
      data-weave={weaveFor(slug)}
      className={cn(
        "weave group relative block h-[156px] overflow-hidden rounded-[var(--radius-lg)] shadow-rest transition-[box-shadow,transform] duration-[var(--dur-base)] ease-[var(--ease-out)] motion-safe:hover:-translate-y-[3px] hover:shadow-lift sm:h-[196px] lg:h-[216px]",
        photo && "p-[7px]",
        className,
      )}
    >
      {photo ? (
        <div className="absolute inset-[7px] overflow-hidden rounded-[8px] bg-sunken" aria-hidden="true">
          {photo.kind === "slot" ? (
            <Photo slot={photo.id} className="size-full" sizes={sizes} />
          ) : (
            <Image src={photo.url} alt="" fill sizes={sizes} className="object-cover" />
          )}
        </div>
      ) : null}
      <span className="plate plate-sm absolute bottom-3 left-3 right-3 block px-4 pb-3 pt-3.5 sm:right-auto sm:max-w-[min(100%-1.5rem,15rem)]">
        <span className="block font-display text-[17px] leading-[1.1] text-ink sm:text-[19px]">{name}</span>
        {count > 0 ? <span className="tabular mt-1 block text-[13px] font-semibold text-ink-muted">{shelfCount(count)}</span> : null}
      </span>
    </Link>
  );
}
