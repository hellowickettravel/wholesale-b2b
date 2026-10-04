import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageOpen, Search, X } from "lucide-react";
import { CategoryArt } from "@/components/catalogue/category-art";
import { ProductCard } from "@/components/catalogue/product-card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { CATALOGUE_PAGE_SIZE, catalogueHref, parseCatalogueQuery } from "@/lib/catalogue/query";
import { cn } from "@/lib/cn";
import { publicImageUrl } from "@/lib/storage";
import { getPublicCategories, searchPublicProducts } from "@/server/catalogue";

export async function generateMetadata({ searchParams }: PageProps<"/catalogue">): Promise<Metadata> {
  const { category } = parseCatalogueQuery(await searchParams);
  const cat = category ? (await getPublicCategories()).find((c) => c.slug === category) : null;
  return {
    title: cat ? cat.name : "Catalogue",
    description: cat
      ? `${cat.name} for restaurants: browse sizes and open a trade account to see your prices.`
      : "Wholesale rice, pulses, spices, flours, tea, sauces, drinks and packaging for restaurants.",
    alternates: { canonical: catalogueHref({ category }) },
  };
}

export default async function CataloguePage({ searchParams }: PageProps<"/catalogue">) {
  const query = parseCatalogueQuery(await searchParams);
  const categories = await getPublicCategories();
  const active = query.category ? categories.find((c) => c.slug === query.category) : null;
  if (query.category && !active) notFound();

  const { items, total, pageCount } = await searchPublicProducts(active?.slug ?? null, query.words, query.page);
  const totalProducts = categories.reduce((n, c) => n + c.productCount, 0);
  const from = total === 0 ? 0 : (query.page - 1) * CATALOGUE_PAGE_SIZE + 1;
  const to = Math.min(total, query.page * CATALOGUE_PAGE_SIZE);

  return (
    <>
      <section className="border-b border-line bg-raised">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
            <Link href="/catalogue" className="hover:text-ink">Catalogue</Link>
            {active ? <><span aria-hidden="true"> / </span><span className="text-ink">{active.name}</span></> : null}
          </nav>
          <div className="mt-2 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold sm:text-4xl">{active ? active.name : "Catalogue"}</h1>
              <p className="mt-2 max-w-xl text-ink-muted">
                {active
                  ? (active.description ?? `${active.productCount} ${active.productCount === 1 ? "product" : "products"} in ${active.name}.`)
                  : `${totalProducts} products across ${categories.length} categories.`}{" "}
                Trade prices show once your account is approved.
              </p>
            </div>
            <form action="/catalogue" role="search" className="flex w-full gap-2 md:w-96">
              {active ? <input type="hidden" name="category" value={active.slug} /> : null}
              <label htmlFor="catalogue-q" className="sr-only">Search products</label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
                <input
                  id="catalogue-q"
                  name="q"
                  type="search"
                  defaultValue={query.q}
                  placeholder={active ? `Search ${active.name.toLowerCase()}` : "Search, e.g. basmati, toor dal"}
                  className="block h-11 w-full rounded-[var(--radius-md)] border border-line-strong bg-surface pl-9 pr-3 text-[15px] text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button type="submit" className="h-11 rounded-[var(--radius-md)] bg-primary px-4 text-sm font-semibold text-primary-ink hover:bg-primary-strong">
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr]">
        {/* Categories: chips on mobile, list on desktop */}
        <nav aria-label="Categories" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <h2 className="sr-only">Categories</h2>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
            <CategoryLink href={catalogueHref({ q: query.q })} current={!active} label="All products" count={totalProducts} />
            {categories.map((c) => (
              <CategoryLink key={c.id} href={catalogueHref({ category: c.slug, q: query.q })} current={active?.id === c.id} label={c.name} count={c.productCount} />
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <p className="tabular text-sm text-ink-muted" aria-live="polite">
              {total === 0 ? "No products" : `Showing ${from}–${to} of ${total}`}
              {query.q ? <> for <span className="font-semibold text-ink">&ldquo;{query.q}&rdquo;</span></> : null}
            </p>
            {query.q ? (
              <Link href={catalogueHref({ category: active?.slug })} className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-raised px-3 py-1 text-sm font-medium text-ink hover:bg-sunken">
                <X className="size-3.5" aria-hidden="true" /> Clear search
              </Link>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-raised">
              <EmptyState
                icon={<PackageOpen />}
                title={query.q ? "Nothing matches that search" : "Products are being added"}
                action={query.q ? <LinkButton href={catalogueHref({ category: active?.slug })} variant="secondary">Clear search</LinkButton> : <LinkButton href="/register">Open a trade account</LinkButton>}
              >
                {query.q
                  ? "Try a shorter word, or check the spelling. Trade customers can also ask us for items we do not list yet."
                  : "We are loading this range now. Register and we will show you everything available for your kitchen."}
              </EmptyState>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {items.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </ul>
          )}

          <Pagination page={Math.min(query.page, pageCount)} pageCount={pageCount} hrefFor={(p) => catalogueHref({ category: active?.slug, q: query.q, page: p })} />

          <aside className="mt-10 flex flex-col items-start gap-4 overflow-hidden rounded-[var(--radius-xl)] bg-primary p-6 text-primary-ink sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-center gap-4">
              {active ? <CategoryArt slug={active.slug} imageUrl={publicImageUrl(active.imagePath)} className="hidden size-16 shrink-0 rounded-[var(--radius-md)] sm:grid" iconClassName="size-7" sizes="64px" /> : null}
              <div>
                <h2 className="text-xl font-bold">See your trade prices</h2>
                <p className="mt-1 text-sm text-white/75">Prices are agreed per restaurant. Open an account and we will set yours up.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/register" variant="accent">Open an account</LinkButton>
              <LinkButton href="/login" variant="ghost" className="text-primary-ink hover:bg-white/10">Sign in</LinkButton>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function CategoryLink({ href, current, label, count }: { href: string; current: boolean; label: string; count: number }) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex items-center justify-between gap-3 whitespace-nowrap rounded-full border lg:whitespace-normal px-3.5 py-1.5 text-sm font-medium transition-colors lg:rounded-[var(--radius-md)] lg:border-transparent lg:px-3 lg:py-2",
          current ? "border-primary bg-primary text-primary-ink lg:bg-primary-soft lg:text-primary-strong" : "border-line-strong bg-raised text-ink hover:bg-sunken lg:bg-transparent",
        )}
      >
        <span>{label}</span>
        <span className={cn("tabular text-xs", current ? "opacity-80" : "text-ink-subtle")}>{count}</span>
      </Link>
    </li>
  );
}
