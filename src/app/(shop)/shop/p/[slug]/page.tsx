import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductImage } from "@/components/brand/product-image";
import { CategoryArt } from "@/components/catalogue/category-art";
import { AddToBasket } from "@/components/shop/add-to-basket";
import { ShopRow } from "@/components/shop/shop-row";
import { applyBp, formatBp, formatPence } from "@/domain/money";
import { catalogueHref } from "@/lib/catalogue/query";
import { publicImageUrl } from "@/lib/storage";
import { requireRole } from "@/server/auth";
import { displayPence, getShopProduct, getShopSettings, listShopProducts } from "@/server/shop";

function validSlug(slug: string) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 120;
}

export async function generateMetadata({ params }: PageProps<"/shop/p/[slug]">): Promise<Metadata> {
  const viewer = await requireRole("customer");
  const { slug } = await params;
  const product = validSlug(slug) ? await getShopProduct(viewer.customer!.id, slug) : null;
  return { title: product ? product.name : "Product not found" };
}

export default async function ShopProductPage({ params }: PageProps<"/shop/p/[slug]">) {
  const viewer = await requireRole("customer");
  const customerId = viewer.customer!.id;
  const { slug } = await params;
  if (!validSlug(slug)) notFound();
  // Not found and not on this restaurant's list look the same (no hint that it exists).
  const [product, settings, all] = await Promise.all([getShopProduct(customerId, slug), getShopSettings(customerId), listShopProducts(customerId)]);
  if (!product) notFound();
  const related = all.filter((p) => p.category.id === product.category.id && p.id !== product.id).slice(0, 4);
  const vatLabel = settings.showIncVat ? "inc VAT" : "ex VAT";
  const categoryHref = catalogueHref({ category: product.category.slug }, "/shop");

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm text-ink-muted">
        <Link href="/shop" className="hover:text-ink">Your catalogue</Link>
        <span aria-hidden="true">/</span>
        <Link href={categoryHref} className="hover:text-ink">{product.category.name}</Link>
      </nav>

      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-10">
        <ProductImage
          src={publicImageUrl(product.imagePath)}
          alt={product.name}
          name={product.name}
          priority
          sizes="(min-width: 768px) 460px, 100vw"
          className="mx-auto w-full max-w-sm rounded-[var(--radius-xl)] border border-line md:max-w-none"
          fallback={
            <div role="img" aria-label={`${product.name} (photo coming soon)`} className="mx-auto w-full max-w-sm overflow-hidden rounded-[var(--radius-xl)] border border-line md:max-w-none">
              <CategoryArt slug={product.category.slug} className="aspect-[4/3] md:aspect-square" iconClassName="size-16" />
            </div>
          }
        />

        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{product.name}</h1>
          {product.description ? <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-muted">{product.description}</p> : null}

          <div className="mt-5 rounded-[var(--radius-lg)] border border-line bg-raised p-4 sm:p-5">
            <AddToBasket
              layout="page"
              productName={product.name}
              vatLabel={vatLabel}
              sizes={product.variants.map((v) => ({ id: v.id, sizeLabel: v.sizeLabel, displayPence: displayPence(v, settings.showIncVat), orderable: v.orderable }))}
            />
          </div>

          <section aria-labelledby="sizes-heading" className="mt-6">
            <h2 id="sizes-heading" className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-subtle">Your prices</h2>
            <div className="mt-2 overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-raised">
              <table className="w-full text-sm">
                <thead className="bg-sunken text-left text-xs font-semibold text-ink-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2">Size</th>
                    <th scope="col" className="px-4 py-2 text-right">Ex VAT</th>
                    <th scope="col" className="px-4 py-2 text-right">VAT</th>
                    <th scope="col" className="px-4 py-2 text-right">Inc VAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {product.variants.map((v) => (
                    <tr key={v.id}>
                      <th scope="row" className="px-4 py-2.5 text-left font-medium text-ink">{v.sizeLabel}</th>
                      {v.pricePence === null ? (
                        <td colSpan={3} className="px-4 py-2.5 text-right text-ink-muted">Price on request</td>
                      ) : (
                        <>
                          <td className="tabular px-4 py-2.5 text-right">{formatPence(v.pricePence)}</td>
                          <td className="tabular px-4 py-2.5 text-right text-ink-muted">{formatBp(v.vatRateBp)}</td>
                          <td className="tabular px-4 py-2.5 text-right">{formatPence(v.pricePence + applyBp(v.pricePence, v.vatRateBp))}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[13px] text-ink-muted">Prices agreed for {viewer.customer!.businessName}. VAT is added per line at checkout.</p>
          </section>
        </div>
      </div>

      {related.length ? (
        <section aria-labelledby="related-heading" className="mt-10">
          <div className="flex items-end justify-between gap-4 pb-3">
            <h2 id="related-heading" className="text-lg font-bold sm:text-xl">More in {product.category.name}</h2>
            <Link href={categoryHref} className="shrink-0 text-sm font-semibold text-primary hover:underline">See all</Link>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
            {related.map((p) => (
              <ShopRow key={p.id} product={p} showIncVat={settings.showIncVat} showCategory={false} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
