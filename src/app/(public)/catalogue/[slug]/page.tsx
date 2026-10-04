import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Lock } from "lucide-react";
import { ProductImage } from "@/components/brand/product-image";
import { CategoryArt } from "@/components/catalogue/category-art";
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm text-ink-muted">
        <Link href="/catalogue" className="hover:text-ink">Catalogue</Link>
        <span aria-hidden="true">/</span>
        <Link href={catalogueHref({ category: product.category.slug })} className="hover:text-ink">{product.category.name}</Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-ink">{product.name}</span>
      </nav>

      <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
        <ProductImage
          src={publicImageUrl(product.imagePath)}
          alt={product.name}
          name={product.name}
          priority
          sizes="(min-width: 768px) 520px, 100vw"
          className="rounded-[var(--radius-xl)] border border-line"
          fallback={
            <div role="img" aria-label={`${product.name} (photo coming soon)`} className="relative overflow-hidden rounded-[var(--radius-xl)] border border-line">
              <CategoryArt slug={product.category.slug} className="aspect-square" iconClassName="size-20" />
              <span className="absolute bottom-3 left-3 rounded-full bg-raised/85 px-3 py-1 text-xs font-medium text-ink-muted backdrop-blur">Photo coming soon</span>
            </div>
          }
        />

        <div className="min-w-0">
          <Link href={catalogueHref({ category: product.category.slug })} className="text-sm font-semibold text-primary hover:underline">
            {product.category.name}
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">{product.name}</h1>
          {product.description ? <p className="mt-4 whitespace-pre-line leading-relaxed text-ink-muted">{product.description}</p> : null}

          <section aria-labelledby="sizes-heading" className="mt-6">
            <h2 id="sizes-heading" className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-subtle">
              {product.variants.length === 1 ? "Pack size" : "Pack sizes"}
            </h2>
            {product.variants.length ? (
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
                {product.variants.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <Check className="size-4 text-success" aria-hidden="true" /> {v.sizeLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-ink-subtle">
                      <Lock className="size-3.5" aria-hidden="true" /> Trade price
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-ink-muted">Sizes are being added. Ask us after you register.</p>
            )}
          </section>

          <div className="mt-6 rounded-[var(--radius-lg)] border border-accent/40 bg-accent-soft p-5">
            <p className="flex items-center gap-2 font-semibold text-accent-ink">
              <Lock className="size-4" aria-hidden="true" /> Register to see price
            </p>
            <p className="mt-1 text-sm text-accent-ink/80">
              Prices are agreed with each restaurant and shown once your trade account is approved.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <LinkButton href="/register">
                Open a trade account <ArrowRight className="size-4" aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/login" variant="secondary">Sign in</LinkButton>
            </div>
          </div>
        </div>
      </div>

      {related.length ? (
        <section aria-labelledby="related-heading" className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <h2 id="related-heading" className="text-xl font-bold sm:text-2xl">More in {product.category.name}</h2>
            <Link href={catalogueHref({ category: product.category.slug })} className="shrink-0 text-sm font-semibold text-primary hover:underline">
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
