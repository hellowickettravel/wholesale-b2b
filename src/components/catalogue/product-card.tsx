import Link from "next/link";
import { cn } from "@/lib/cn";
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
        className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised shadow-rest transition-[box-shadow,transform] duration-[var(--dur-base)] ease-[var(--ease-out)] motion-safe:hover:-translate-y-[3px] hover:shadow-lift"
      >
        <ProductImage
          src={publicImageUrl(product.imagePath)}
          alt={product.name}
          name={product.name}
          categorySlug={product.category.slug}
          sizeLabel={product.sizes.length === 1 ? product.sizes[0] : undefined}
          priority={priority}
          className="aspect-[4/3]"
          sizes="(min-width: 1280px) 270px, (min-width: 768px) 30vw, 46vw"
        />
        <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          <span className="truncate text-xs font-medium text-ink-subtle">{product.category.name}</span>
          <span className={cn("line-clamp-2 text-[15px] font-bold leading-snug text-ink", !product.imagePath && "sr-only")}>{product.name}</span>
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
