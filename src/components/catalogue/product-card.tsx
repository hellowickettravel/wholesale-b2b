import Link from "next/link";
import { ProductImage } from "@/components/brand/product-image";
import { sizeRange } from "@/lib/catalogue/query";
import { publicImageUrl } from "@/lib/storage";
import type { PublicProductCard } from "@/server/catalogue";
import { CategoryArt } from "./category-art";
import { PriceLock } from "./price-lock";

export function ProductCard({ product, priority }: { product: PublicProductCard; priority?: boolean }) {
  const range = sizeRange(product.sizes);
  return (
    <li className="min-w-0">
      <Link
        href={`/catalogue/${product.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[0_10px_30px_-18px_rgba(24,33,29,0.45)]"
      >
        <ProductImage
          src={publicImageUrl(product.imagePath)}
          alt={product.name}
          name={product.name}
          priority={priority}
          className="border-b border-line"
          fallback={
            <div role="img" aria-label={`${product.name} (photo coming soon)`} className="border-b border-line">
              <CategoryArt slug={product.category.slug} className="aspect-square" iconClassName="size-12 sm:size-14" />
            </div>
          }
          sizes="(min-width: 1280px) 230px, (min-width: 768px) 30vw, 46vw"
        />
        <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          <span className="truncate text-xs font-medium text-ink-subtle">{product.category.name}</span>
          <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink group-hover:text-primary">{product.name}</span>
          <span className="text-sm text-ink-muted">
            {range ? (
              <>
                {range}
                {product.sizes.length > 1 ? <span className="text-ink-subtle"> · {product.sizes.length} sizes</span> : null}
              </>
            ) : (
              "Sizes coming soon"
            )}
          </span>
          <PriceLock className="mt-auto self-start" />
        </div>
      </Link>
    </li>
  );
}
