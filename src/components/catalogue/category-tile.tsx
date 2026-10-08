import Link from "next/link";
import { CategoryIcon } from "./category-icon";

export function shelfCount(n: number) {
  return `${n} ${n === 1 ? "product" : "products"}`;
}

/**
 * A compact category tile for the home page: the category's icon on its colour wash, the name under it.
 * Reads well with or without photos and fits six across on desktop, three on phones.
 */
export function CategoryTile({ slug, name, count, href }: { slug: string; name: string; count: number; href: string }) {
  return (
    <Link
      href={href}
      data-ground={slug}
      className="group flex h-full flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-raised px-2 py-5 text-center transition-[box-shadow,border-color,transform] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:border-transparent hover:shadow-lift motion-safe:hover:-translate-y-1"
    >
      <span className="weave grid size-16 place-items-center rounded-full transition-transform duration-[var(--dur-base)] group-hover:scale-105 sm:size-[4.5rem]">
        <CategoryIcon slug={slug} className="size-7 sm:size-8" />
      </span>
      <span className="text-[13px] font-semibold leading-snug text-ink sm:text-sm">{name}</span>
      {count > 0 ? <span className="sr-only">{shelfCount(count)}</span> : null}
    </Link>
  );
}
