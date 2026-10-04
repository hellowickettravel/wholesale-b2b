import Link from "next/link";
import { ProductImage } from "@/components/brand/product-image";
import { CategoryArt } from "@/components/catalogue/category-art";
import { publicImageUrl } from "@/lib/storage";
import { displayPence, type ShopProduct } from "@/server/shop";
import { AddToBasket } from "./add-to-basket";

export function ProductThumb({ product, className = "size-14 sm:size-16" }: { product: Pick<ShopProduct, "name" | "imagePath"> & { categorySlug: string }; className?: string }) {
  return (
    <ProductImage
      src={publicImageUrl(product.imagePath)}
      alt=""
      name={product.name}
      className={`${className} rounded-[var(--radius-md)] border border-line [&_img]:p-1`}
      sizes="64px"
      fallback={<CategoryArt slug={product.categorySlug} className={`${className} rounded-[var(--radius-md)]`} iconClassName="size-6" />}
    />
  );
}

/** One product in the restaurant's list: photo, name, size dropdown, own price, quantity, Add. */
export function ShopRow({ product, showIncVat, showCategory }: { product: ShopProduct; showIncVat: boolean; showCategory: boolean }) {
  const href = `/shop/p/${product.slug}`;
  // One size with no price: on phones say so in the subtitle instead of a line of its own.
  const compact = product.variants.length === 1 && product.variants[0].pricePence === null;
  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 px-3 py-3.5 sm:grid-cols-[4rem_minmax(0,1fr)] sm:px-4 lg:grid-cols-[4rem_minmax(0,1fr)_auto] lg:items-center lg:gap-x-4">
      <Link href={href} tabIndex={-1} aria-hidden="true">
        <ProductThumb product={{ ...product, categorySlug: product.category.slug }} />
      </Link>
      <div className="min-w-0 self-center">
        <Link href={href} className="line-clamp-2 font-semibold leading-snug text-ink hover:text-primary">
          {product.name}
        </Link>
        <p className="mt-0.5 truncate text-[13px] text-ink-muted">
          {showCategory ? <>{product.category.name} · </> : null}
          {product.variants.length === 1 ? product.variants[0].sizeLabel : `${product.variants.length} sizes`}
          {compact ? <span className="lg:hidden"> · Price on request</span> : null}
        </p>
      </div>
      <div className={compact ? "hidden lg:block" : "col-span-2 lg:col-span-1"}>
        <AddToBasket
          productName={product.name}
          vatLabel={showIncVat ? "inc VAT" : "ex VAT"}
          sizes={product.variants.map((v) => ({ id: v.id, sizeLabel: v.sizeLabel, displayPence: displayPence(v, showIncVat), orderable: v.orderable }))}
        />
      </div>
    </li>
  );
}
