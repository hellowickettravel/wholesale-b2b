import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AddToBasket } from "@/components/shop/add-to-basket";
import { ProductTile } from "@/components/shop/product-tile";
import { ShopRow } from "@/components/shop/shop-row";
import { SizeSelectionProvider } from "@/components/shop/size-selection";
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
  const firstOrderable = product.variants.find((v) => v.orderable) ?? product.variants[0];
  const crumb = "inline-flex min-h-11 items-center rounded-[var(--radius-sm)] font-semibold text-ink-muted hover:text-ink hover:underline hover:underline-offset-2";

  return (
    <SizeSelectionProvider initialSizeId={firstOrderable.id}>
      <div className="max-md:pb-20">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-x-1 text-sm">
          <Link href="/shop" className={crumb}>Your catalogue</Link>
          <ChevronRight className="size-4 text-ink-subtle" aria-hidden="true" />
          <Link href={categoryHref} className={crumb}>{product.category.name}</Link>
        </nav>

        <div className="mt-2 grid gap-x-12 gap-y-5 md:mt-4 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="md:sticky md:top-24 md:self-start">
            <ProductTile
              name={product.name}
              categorySlug={product.category.slug}
              categoryName={product.category.name}
              imageUrl={publicImageUrl(product.imagePath)}
              sizes={product.variants.map((v) => ({ id: v.id, label: v.sizeLabel }))}
              className="!aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-xl)] md:!aspect-[5/4]"
            />
          </div>

          <div className="min-w-0">
            <h1 className="text-[clamp(1.875rem,1.4rem+2vw,2.75rem)] leading-[1.1]">{product.name}</h1>

            <AddToBasket
              layout="page"
              productName={product.name}
              vatLabel={vatLabel}
              sizes={product.variants.map((v) => ({ id: v.id, sizeLabel: v.sizeLabel, displayPence: displayPence(v, settings.showIncVat), orderable: v.orderable }))}
            />

            {product.description ? <p className="mt-6 max-w-prose whitespace-pre-line leading-relaxed text-ink-muted">{product.description}</p> : null}

            <section aria-labelledby="sizes-heading" className="mt-8">
              <h2 id="sizes-heading" className="text-xl">Your prices</h2>
              <div className="mt-3 overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-raised">
                <table className="w-full text-sm">
                  <thead className="bg-sunken text-left text-sm font-bold text-ink">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Size</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Ex VAT</th>
                      <th scope="col" className="px-4 py-2.5 text-right">VAT</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Inc VAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {product.variants.map((v) => (
                      <tr key={v.id}>
                        <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">{v.sizeLabel}</th>
                        {v.pricePence === null ? (
                          <td colSpan={3} className="px-4 py-3 text-right text-ink-muted">Price on request</td>
                        ) : (
                          <>
                            <td className="tabular px-4 py-3 text-right font-semibold">{formatPence(v.pricePence)}</td>
                            <td className="tabular px-4 py-3 text-right text-ink-muted">{formatBp(v.vatRateBp)}</td>
                            <td className="tabular px-4 py-3 text-right font-semibold">{formatPence(v.pricePence + applyBp(v.pricePence, v.vatRateBp))}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-sm text-ink-muted">Prices agreed for {viewer.customer!.businessName}. VAT is added per line at checkout.</p>
            </section>
          </div>
        </div>

        {related.length ? (
          <section aria-labelledby="related-heading" className="mt-12">
            <div className="flex items-end justify-between gap-4 pb-3">
              <h2 id="related-heading" className="text-2xl">More in {product.category.name}</h2>
              <Link href={categoryHref} className="inline-flex min-h-11 shrink-0 items-center font-bold text-primary hover:underline">See all</Link>
            </div>
            <ul className="@container divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised shadow-rest">
              {related.map((p) => (
                <ShopRow key={p.id} product={p} showIncVat={settings.showIncVat} showCategory={false} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </SizeSelectionProvider>
  );
}
