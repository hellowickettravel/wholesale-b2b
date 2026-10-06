import Link from "next/link";
import { ProductImage } from "@/components/brand/product-image";
import { publicImageUrl } from "@/lib/storage";
import { displayPence, type ShopProduct } from "@/server/shop";
import { AddToBasket } from "./add-to-basket";

export function ProductThumb({ product, sizeLabel, className = "size-14 sm:size-16" }: { product: Pick<ShopProduct, "name" | "imagePath"> & { categorySlug: string }; sizeLabel?: string; className?: string }) {
  return (
    <ProductImage
      variant="thumb"
      src={publicImageUrl(product.imagePath)}
      alt=""
      name={product.name}
      categorySlug={product.categorySlug}
      sizeLabel={sizeLabel}
      className={`${className} rounded-[var(--radius-md)]`}
      sizes="64px"
    />
  );
}

/** One product in the restaurant's list: photo, name, size dropdown, own price, quantity, Add. */
export function ShopRow({ product, showIncVat, showCategory }: { product: ShopProduct; showIncVat: boolean; showCategory: boolean }) {
  const href = `/shop/p/${product.slug}`;
  // One size with no price: on phones say so in the subtitle instead of a line of its own.
  const compact = product.variants.length === 1 && product.variants[0].pricePence === null;
  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 px-3 py-3.5 sm:grid-cols-[4rem_minmax(0,1fr)] sm:px-4 @min-[56rem]:grid-cols-[4rem_minmax(0,1fr)_auto] @min-[56rem]:items-center @min-[56rem]:gap-x-4">
      <Link href={href} tabIndex={-1} aria-hidden="true">
        <ProductThumb product={{ ...product, categorySlug: product.category.slug }} sizeLabel={product.variants.length === 1 ? product.variants[0].sizeLabel : undefined} />
      </Link>
      <div className="min-w-0 self-center">
        <Link href={href} className="line-clamp-2 text-[1.0625rem] font-bold leading-snug text-ink hover:text-primary hover:underline hover:decoration-1 hover:underline-offset-2">
          {product.name}
        </Link>
        <p data-ground={product.category.slug} className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[0.8125rem] leading-snug text-ink-muted">
          {showCategory ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-[var(--g)]" />
              <span className="truncate">{product.category.name}</span>
            </span>
          ) : null}
          <span className={product.variants.length === 1 ? "@min-[56rem]:hidden" : undefined}>{product.variants.length === 1 ? product.variants[0].sizeLabel : `${product.variants.length} sizes`}</span>
          {compact ? <span className="font-semibold @min-[56rem]:hidden">Price on request</span> : null}
        </p>
      </div>
      <div className={compact ? "hidden @min-[56rem]:block" : "col-span-2 @min-[56rem]:col-span-1"}>
        <AddToBasket
          productName={product.name}
          vatLabel={showIncVat ? "inc VAT" : "ex VAT"}
          sizes={product.variants.map((v) => ({ id: v.id, sizeLabel: v.sizeLabel, displayPence: displayPence(v, showIncVat), orderable: v.orderable }))}
        />
      </div>
    </li>
  );
}
