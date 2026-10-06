import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { PriceLockStrip } from "@/components/catalogue/price-lock";
import { ProductPlate } from "@/components/catalogue/product-plate";
import { ProductCard } from "@/components/catalogue/product-card";
import { LinkButton } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { catalogueHref, sizeRange } from "@/lib/catalogue/query";
import { publicImageUrl } from "@/lib/storage";
import { getPublicProduct } from "@/server/catalogue";

// Rendered on first visit, then served from cache; admin edits expire it via the catalogue tag.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

function validSlug(slug: string) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 120;
}

export async function generateMetadata({ params }: PageProps<"/catalogue/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = validSlug(slug) ? await getPublicProduct(slug) : null;
  if (!found) return { title: "Product not found" };
  const { product } = found;
  const sizes = sizeRange(product.variants.map((v) => v.sizeLabel));
  const description = `${product.name}${sizes ? ` (${sizes})` : ""}. ${product.category.name} for restaurants from ${brand.name}. Register to see your trade price.`;
  const image = publicImageUrl(product.imagePath);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/catalogue/${product.slug}` },
    openGraph: { title: product.name, description, type: "website", images: image ? [{ url: image }] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps<"/catalogue/[slug]">) {
  const { slug } = await params;
  if (!validSlug(slug)) notFound();
  const found = await getPublicProduct(slug);
  if (!found) notFound();
  const { product, related } = found;

  const sizeLabel = sizeRange(product.variants.map((v) => v.sizeLabel));

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-ink-muted">
        <Link href="/catalogue" className="inline-flex min-h-8 items-center underline-offset-4 hover:text-ink hover:underline">Catalogue</Link>
        <span aria-hidden="true">/</span>
        <Link href={catalogueHref({ category: product.category.slug })} className="inline-flex min-h-8 items-center underline-offset-4 hover:text-ink hover:underline">{product.category.name}</Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-ink">{product.name}</span>
      </nav>

      <div className="mt-4 grid gap-8 md:grid-cols-2 md:gap-12">
        <ProductPlate
          src={publicImageUrl(product.imagePath)}
          name={product.name}
          categoryName={product.category.name}
          categorySlug={product.category.slug}
          sizeLabel={sizeLabel}
          className="md:sticky md:top-24 md:self-start"
        />

        <div className="min-w-0">
          <h1 className="text-[clamp(1.875rem,1.4rem+2vw,2.75rem)] leading-[1.1] text-ink">{product.name}</h1>
          {product.description ? <p className="mt-4 max-w-prose whitespace-pre-line text-base text-ink-muted">{product.description}</p> : null}

          <section aria-labelledby="sizes-heading" className="mt-7">
            <h2 id="sizes-heading" className="text-xl text-ink">
              {product.variants.length === 1 ? "Pack size" : "Pack sizes"}
            </h2>
            {product.variants.length ? (
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
                {product.variants.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <span className="flex items-center gap-2.5 text-base font-bold text-ink">
                      <Check className="size-4 shrink-0 text-success" aria-hidden="true" /> {v.sizeLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                      <Lock className="size-3.5" aria-hidden="true" /> Trade price
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-base text-ink-muted">Sizes are being added. Ask us after you register.</p>
            )}
          </section>

          {/* The price lock, once for the whole page */}
          <PriceLockStrip className="mt-6 px-5 py-4">
            <p className="text-base font-bold">Register to see price</p>
            <p className="mt-1 text-[15px] font-normal">Prices are agreed with each restaurant and shown once your trade account is approved.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <LinkButton href="/register">Open a trade account</LinkButton>
              <LinkButton href="/login" variant="secondary">Sign in</LinkButton>
            </div>
          </PriceLockStrip>
        </div>
      </div>

      {related.length ? (
        <section aria-labelledby="related-heading" className="mt-14 sm:mt-16">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <h2 id="related-heading" className="text-[clamp(1.5rem,1.2rem+1.2vw,1.875rem)] leading-[1.15] text-ink">More in {product.category.name}</h2>
            <Link href={catalogueHref({ category: product.category.slug })} className="inline-flex min-h-11 shrink-0 items-center text-base font-bold text-primary underline-offset-4 hover:underline">
              See all
            </Link>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
