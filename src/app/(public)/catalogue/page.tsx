import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, LayoutGrid, Search, X } from "lucide-react";
import { CategoryIcon } from "@/components/catalogue/category-icon";
import { PlateMessage } from "@/components/brand/plate-message";
import { PriceLockStrip } from "@/components/catalogue/price-lock";
import { shelfCount } from "@/components/catalogue/category-tile";
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
      <section className="border-b border-line bg-raised">
        <div className={`${wrap} flex flex-col gap-5 py-7 sm:py-9 md:flex-row md:items-end md:justify-between`}>
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-ink-muted">
              <Link href="/" className="hover:text-primary hover:underline">Home</Link>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              {active ? (
                <>
                  <Link href="/catalogue" className="hover:text-primary hover:underline">Catalogue</Link>
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                  <span className="text-ink">{active.name}</span>
                </>
              ) : (
                <span className="text-ink">Catalogue</span>
              )}
            </nav>
            <div className="mt-3 flex items-center gap-3.5">
              {active ? (
                <span data-ground={active.slug} className="weave grid size-14 shrink-0 place-items-center rounded-[var(--radius-lg)]">
                  <CategoryIcon slug={active.slug} className="size-7" />
                </span>
              ) : null}
              <div>
                <h1 className="text-[clamp(1.75rem,1.4rem+1.6vw,2.5rem)] leading-[1.1] text-ink">{active ? active.name : "The catalogue"}</h1>
                <p className="tabular mt-1 text-sm text-ink-muted">{shelfCount(active ? active.productCount : totalProducts)}{active?.description ? ` · ${active.description}` : " for restaurants, takeaways and caterers"}</p>
              </div>
            </div>
          </div>
          <form action="/catalogue" role="search" className="relative w-full md:w-[26rem]">
            {active ? <input type="hidden" name="category" value={active.slug} /> : null}
            <label htmlFor="catalogue-q" className="sr-only">Search products</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input
              id="catalogue-q"
              name="q"
              type="search"
              defaultValue={query.q}
              placeholder={active ? `Search ${active.name.toLowerCase()}` : "Search rice, dal, spices…"}
              className="block h-12 w-full rounded-full border border-line bg-surface pl-11 pr-24 text-base text-ink placeholder:text-ink-subtle transition-[border-color,background-color,box-shadow] focus:border-primary focus:bg-raised focus:shadow-[0_0_0_3px_rgb(37_99_235/0.15)] focus:outline-none"
            />
            <button type="submit" className="absolute right-1.5 top-1.5 h-9 cursor-pointer rounded-full bg-primary px-4 text-sm font-semibold text-primary-ink transition-colors hover:bg-primary-strong">
              Search
            </button>
          </form>
        </div>
      </section>

      <div className={`${wrap} grid gap-6 py-6 sm:gap-8 sm:py-8 lg:grid-cols-[230px_1fr]`}>
        {/* Shelves: chips on mobile, list on desktop */}
        <nav aria-label="Categories" className="min-w-0 lg:sticky lg:top-32 lg:self-start lg:rounded-[var(--radius-lg)] lg:border lg:border-line lg:bg-raised lg:p-2">
          <h2 className="hidden px-3 pb-2 pt-2 text-xs font-bold uppercase tracking-[0.08em] text-ink-subtle lg:block">Categories</h2>
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
            <p className="tabular text-sm text-ink-muted" aria-live="polite">
              {total === 0 ? "No products" : `Showing ${from}–${to} of ${total}`}
              {query.q ? <> for <span className="font-bold text-ink">&ldquo;{query.q}&rdquo;</span></> : null}
            </p>
            {query.q ? (
              <Link href={catalogueHref({ category: active?.slug })} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-raised px-3.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary">
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
              <h2 className="text-xl text-on-dark">See your trade prices</h2>
              <p className="mt-1 max-w-[44ch] text-base">Prices are agreed per restaurant. Open an account and we will set yours up.</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <LinkButton href="/register" variant="accent" className="rounded-full">Open an account</LinkButton>
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
        data-ground={slug}
        className={cn(
          "flex h-10 items-center gap-2.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors duration-[var(--dur-fast)] lg:h-auto lg:min-h-10 lg:justify-between lg:whitespace-normal lg:rounded-[var(--radius-md)] lg:border-transparent lg:px-3 lg:py-2",
          current ? "border-primary bg-primary text-primary-ink lg:bg-primary-soft lg:text-primary" : "border-line bg-raised text-ink hover:border-primary lg:bg-transparent lg:hover:bg-surface lg:hover:text-primary",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {slug ? <CategoryIcon slug={slug} className={cn("size-4 shrink-0 max-lg:hidden", current && "!text-primary")} /> : <LayoutGrid className="size-4 shrink-0 max-lg:hidden" aria-hidden="true" />}
          <span>{label}</span>
        </span>
        <span className={cn("tabular text-xs", current ? "text-on-dark-muted lg:text-primary" : "text-ink-muted")}>{count}</span>
      </Link>
    </li>
  );
}
