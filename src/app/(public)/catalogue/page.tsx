import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search, X } from "lucide-react";
import { PlateMessage } from "@/components/brand/plate-message";
import { PriceLockStrip } from "@/components/catalogue/price-lock";
import { shelfCount } from "@/components/catalogue/shelf-tile";
import { ProductCard } from "@/components/catalogue/product-card";
import { LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { CATALOGUE_PAGE_SIZE, catalogueHref, parseCatalogueQuery } from "@/lib/catalogue/query";
import { cn } from "@/lib/cn";
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

  const wrap = "mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8";

  return (
    <>
      {/* The shelf band: the plate is the page heading. */}
      <section data-ground={active?.slug ?? "default"} className="weave">
        <div className={`${wrap} py-6 sm:py-9`}>
          <div className="plate inline-flex max-w-full flex-col gap-0.5 px-6 py-4 sm:flex-row sm:items-baseline sm:gap-4 sm:px-8 sm:py-5">
            <h1 className="text-[clamp(1.875rem,1.4rem+2vw,2.75rem)] leading-[1.1] text-ink">{active ? active.name : "Catalogue"}</h1>
            <p className="tabular text-base text-ink-muted">{shelfCount(active ? active.productCount : totalProducts)}</p>
          </div>
        </div>
      </section>

      <div className={`${wrap} pt-6 sm:pt-8`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 text-base text-ink-muted">
            {active ? (
              <nav aria-label="Breadcrumb" className="text-sm">
                <Link href="/catalogue" className="font-semibold text-primary underline-offset-4 hover:underline">Catalogue</Link>
                <span aria-hidden="true"> / </span>
                <span className="text-ink">{active.name}</span>
              </nav>
            ) : null}
            {active?.description ? <p className="mt-1 max-w-xl">{active.description}</p> : null}
          </div>
          <form action="/catalogue" role="search" className="flex w-full gap-2 md:w-[26rem]">
            {active ? <input type="hidden" name="category" value={active.slug} /> : null}
            <label htmlFor="catalogue-q" className="sr-only">Search products</label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                id="catalogue-q"
                name="q"
                type="search"
                defaultValue={query.q}
                placeholder={active ? `Search ${active.name.toLowerCase()}` : "Search, e.g. basmati, toor dal"}
                className="block h-12 w-full rounded-[var(--radius-md)] border-[1.5px] border-line-strong bg-raised pl-10 pr-3 text-base text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button type="submit" className="h-12 cursor-pointer rounded-[var(--radius-md)] bg-primary px-5 text-base font-bold text-primary-ink shadow-[var(--edge-primary)] transition-[background-color,transform,box-shadow] duration-[var(--dur-instant)] hover:bg-primary-strong active:translate-y-[2px] active:shadow-none">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className={`${wrap} grid gap-6 py-6 sm:gap-8 sm:py-8 lg:grid-cols-[230px_1fr]`}>
        {/* Shelves: chips on mobile, list on desktop */}
        <nav aria-label="Categories" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <h2 className="sr-only">Categories</h2>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
            <CategoryLink href={catalogueHref({ q: query.q })} current={!active} label="All products" count={totalProducts} />
            {categories.map((c) => (
              <CategoryLink key={c.id} href={catalogueHref({ category: c.slug, q: query.q })} current={active?.id === c.id} label={c.name} count={c.productCount} slug={c.slug} />
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <PriceLockStrip>
            <p><strong className="font-bold">Register to see price.</strong> Trade prices are agreed for each restaurant and shown once your account is approved.</p>
          </PriceLockStrip>

          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="tabular text-base text-ink-muted" aria-live="polite">
              {total === 0 ? "No products" : `Showing ${from}–${to} of ${total}`}
              {query.q ? <> for <span className="font-bold text-ink">&ldquo;{query.q}&rdquo;</span></> : null}
            </p>
            {query.q ? (
              <Link href={catalogueHref({ category: active?.slug })} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-[1.5px] border-line-strong bg-raised px-3.5 text-sm font-bold text-ink transition-colors hover:bg-sunken">
                <X className="size-3.5" aria-hidden="true" /> Clear search
              </Link>
            ) : null}
          </div>

          {items.length === 0 ? (
            <PlateMessage
              ground={active?.slug ?? "default"}
              className="overflow-hidden rounded-[var(--radius-lg)]"
              title={query.q ? "Nothing matches that search" : "Products are being added"}
              actions={query.q ? <LinkButton href={catalogueHref({ category: active?.slug })} variant="secondary">Clear search</LinkButton> : <LinkButton href="/register">Open a trade account</LinkButton>}
            >
              <p>
                {query.q
                  ? "Try a shorter word or check the spelling. Trade customers can ask us for lines we do not list yet."
                  : "We are loading this range now. Register and we will show you everything available for your kitchen."}
              </p>
            </PlateMessage>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {items.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </ul>
          )}

          <Pagination page={Math.min(query.page, pageCount)} pageCount={pageCount} hrefFor={(p) => catalogueHref({ category: active?.slug, q: query.q, page: p })} />

          <aside data-surface="dark" className="on-dark mt-12 flex flex-col items-start gap-5 rounded-[var(--radius-xl)] bg-primary p-6 text-on-dark-muted sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-2xl text-on-dark">See your trade prices</h2>
              <p className="mt-1 max-w-[44ch] text-base">Prices are agreed per restaurant. Open an account and we will set yours up.</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <LinkButton href="/register" variant="accent">Open an account</LinkButton>
              <Link href="/login" className="inline-flex min-h-11 items-center text-base font-bold text-on-dark underline underline-offset-4">Sign in</Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function CategoryLink({ href, current, label, count, slug }: { href: string; current: boolean; label: string; count: number; slug?: string }) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-full border-[1.5px] px-4 text-base font-semibold transition-colors duration-[var(--dur-fast)] lg:justify-between lg:whitespace-normal lg:rounded-[var(--radius-md)] lg:border-transparent lg:px-3",
          current ? "border-ink bg-ink text-on-dark lg:border-ink" : "border-line-strong bg-raised text-ink hover:bg-sunken lg:bg-transparent lg:hover:bg-sunken",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {slug ? <span aria-hidden="true" data-ground={slug} className="size-2.5 shrink-0 rounded-full bg-[var(--g)] ring-1 ring-inset ring-black/15" /> : <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full border-[1.5px] border-current" />}
          <span>{label}</span>
        </span>
        <span className={cn("tabular text-[13px]", current ? "text-on-dark-muted" : "text-ink-muted")}>{count}</span>
      </Link>
    </li>
  );
}
