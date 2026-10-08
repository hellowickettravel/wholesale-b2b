import Link from "next/link";
import { ProductImage } from "@/components/brand/product-image";
import { publicImageUrl } from "@/lib/storage";
import { displayPence, type ShopProduct } from "@/server/shop";
import { AddToBasket } from "./add-to-basket";

/** One product in the restaurant's grid: photo, category, name, size, own price, quantity and Add. */
export function ShopCard({ product, showIncVat, priority }: { product: ShopProduct; showIncVat: boolean; priority?: boolean }) {
  const href = `/shop/p/${product.slug}`;
  const single = product.variants.length === 1 ? product.variants[0] : null;
  return (
    <li className="group/card flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised shadow-rest transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:border-line-strong/40 hover:shadow-lift">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="group block overflow-hidden">
        <ProductImage
          src={publicImageUrl(product.imagePath)}
          alt=""
          name={product.name}
          categorySlug={product.category.slug}
          priority={priority}
          className="aspect-[4/3] w-full"
          sizes="(min-width: 1280px) 280px, (min-width: 768px) 30vw, 46vw"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <Link href={href} className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink transition-colors hover:text-primary sm:text-base">
          {product.name}
        </Link>
        {single ? <p className="text-sm text-ink-muted">{single.sizeLabel}</p> : null}
        <AddToBasket
          layout="card"
          productName={product.name}
          vatLabel={showIncVat ? "inc VAT" : "ex VAT"}
          sizes={product.variants.map((v) => ({ id: v.id, sizeLabel: v.sizeLabel, displayPence: displayPence(v, showIncVat), orderable: v.orderable }))}
        />
      </div>
    </li>
  );
}
