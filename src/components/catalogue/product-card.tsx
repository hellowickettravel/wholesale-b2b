import Link from "next/link";
import { ProductImage } from "@/components/brand/product-image";
import { sizeRange } from "@/lib/catalogue/query";
import { publicImageUrl } from "@/lib/storage";
import type { PublicProductCard } from "@/server/catalogue";
import { PriceLock } from "./price-lock";

export function ProductCard({ product, priority }: { product: PublicProductCard; priority?: boolean }) {
  const range = sizeRange(product.sizes);
  return (
    <li className="min-w-0">
      <Link
        href={`/catalogue/${product.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised shadow-rest transition-[box-shadow,transform,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:border-transparent hover:shadow-lift motion-safe:hover:-translate-y-1"
      >
        <ProductImage
          src={publicImageUrl(product.imagePath)}
          alt={product.name}
          name={product.name}
          categorySlug={product.category.slug}
          priority={priority}
          className="aspect-[4/3]"
          sizes="(min-width: 1280px) 280px, (min-width: 768px) 30vw, 46vw"
        />
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-primary sm:text-base">{product.name}</span>
          <span className="mt-1 text-sm text-ink-muted">{range ?? "Sizes coming soon"}</span>
          <PriceLock className="mt-auto pt-3" />
        </div>
      </Link>
    </li>
  );
}
