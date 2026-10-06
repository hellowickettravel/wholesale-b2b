import type { Metadata } from "next";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { PlateMessage } from "@/components/shop/plate-message";
import { ShopTitle } from "@/components/shop/page-title";
import { SearchFocus } from "@/components/shop/search-focus";
import { ShopRow } from "@/components/shop/shop-row";
import { Button, LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { CATALOGUE_PAGE_SIZE, catalogueHref, matchesWords, parseCatalogueQuery } from "@/lib/catalogue/query";
import { cn } from "@/lib/cn";
import { requireRole } from "@/server/auth";
import { getShopSettings, listShopProducts } from "@/server/shop";

export const metadata: Metadata = { title: "Your catalogue" };

export default async function ShopHome({ searchParams }: PageProps<"/shop">) {
  const viewer = await requireRole("customer");
  const customerId = viewer.customer!.id;
  const query = parseCatalogueQuery(await searchParams);
  const [all, settings] = await Promise.all([listShopProducts(customerId), getShopSettings(customerId)]);

  // Categories this restaurant actually has products in, in catalogue order.
  const categories: { slug: string; name: string; count: number }[] = [];
  for (const p of all) {
    const c = categories.find((x) => x.slug === p.category.slug);
    if (c) c.count++;
    else categories.push({ slug: p.category.slug, name: p.category.name, count: 1 });
  }
  const active = query.category ? (categories.find((c) => c.slug === query.category) ?? null) : null;
  const matching = all.filter((p) => (!active || p.category.slug === active.slug) && matchesWords(p.name, query.words));
  const pageCount = Math.max(1, Math.ceil(matching.length / CATALOGUE_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const items = matching.slice((page - 1) * CATALOGUE_PAGE_SIZE, page * CATALOGUE_PAGE_SIZE);
  const from = matching.length === 0 ? 0 : (page - 1) * CATALOGUE_PAGE_SIZE + 1;
  const to = Math.min(matching.length, page * CATALOGUE_PAGE_SIZE);
  const href = (q: { category?: string | null; q?: string; page?: number }) => catalogueHref(q, "/shop");
  const vat = settings.showIncVat ? "include" : "exclude";

  if (all.length === 0) {
    return (
      <>
        <ShopTitle description={<>Ordering for <span className="font-semibold text-ink">{viewer.customer!.businessName}</span>.</>}>Your catalogue</ShopTitle>
        <PlateMessage title="We are still setting up your catalogue">
          Your account is approved. We are choosing the products and prices for your kitchen and will let you know when ordering opens.
        </PlateMessage>
      </>
    );
  }

  return (
    <>
      <SearchFocus inputId="shop-q" />
      {active ? (
        // The shelf you are on: its ground colour, with the shelf name on a plate (the plate is the heading).
        <div data-ground={active.slug} data-weave="a" className="weave mb-5 rounded-[var(--radius-xl)] px-4 py-5 sm:mb-6 sm:px-8 sm:py-7">
          <div className="plate inline-block max-w-full px-6 py-3.5 sm:px-8">
            <h1 className="text-[clamp(1.875rem,1.4rem+2vw,2.75rem)] leading-[1.1]">{active.name}</h1>
            <p className="tabular mt-0.5 text-sm text-ink-muted">{active.count} {active.count === 1 ? "line" : "lines"} at your prices</p>
          </div>
        </div>
      ) : (
        <ShopTitle description={<>Ordering for <span className="font-semibold text-ink">{viewer.customer!.businessName}</span>. {all.length} products at your prices; prices {vat} VAT.</>}>Your catalogue</ShopTitle>
      )}

      <div className="lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-x-6">
        {/* Phones: one sticky strip (search, then shelves as chips). Wide screens: the strip dissolves; the
            shelves become a sticky rail on the left and the search sticks above the list. */}
        <div className="sticky top-14 z-20 -mx-4 border-b border-line bg-surface px-4 py-2.5 md:top-16 md:-mx-6 md:px-6 lg:contents">
          <form action="/shop" role="search" className="flex w-full gap-2 lg:sticky lg:top-16 lg:z-20 lg:col-start-2 lg:row-start-1 lg:bg-surface lg:pb-3 lg:pt-1">
            {active ? <input type="hidden" name="category" value={active.slug} /> : null}
            <label htmlFor="shop-q" className="sr-only">Search your catalogue</label>
            <div className="relative flex-1 lg:max-w-lg">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                id="shop-q"
                name="q"
                type="search"
                defaultValue={query.q}
                placeholder={active ? `Search ${active.name.toLowerCase()}` : "Search, e.g. basmati, toor dal"}
                className="block h-11 w-full rounded-full border-[1.5px] border-line-strong bg-raised pl-11 pr-4 text-base text-ink placeholder:text-ink-subtle transition-shadow focus:border-focus focus:outline-none focus:ring-[3px] focus:ring-focus/30"
              />
            </div>
            <Button type="submit" className="!rounded-full !px-5">
              <Search className="size-4 sm:hidden" aria-hidden="true" />
              <span className="max-sm:sr-only">Search</span>
            </Button>
          </form>

          <nav
            aria-label="Categories"
            className="-mx-4 mt-2 overflow-x-auto px-4 [scrollbar-width:none] max-lg:[mask-image:linear-gradient(to_right,#000_93%,transparent)] lg:sticky lg:top-24 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mx-0 lg:mt-0 lg:self-start lg:overflow-visible lg:px-0"
          >
            <h2 className="mb-2 hidden text-xl lg:block">Shop by shelf</h2>
            <ul className="flex gap-2 pr-6 lg:flex-col lg:gap-1 lg:pr-0">
              <Chip href={href({ q: query.q })} current={!active} label="All" count={all.length} />
              {categories.map((c) => (
                <Chip key={c.slug} href={href({ category: c.slug, q: query.q })} current={active?.slug === c.slug} label={c.name} count={c.count} ground={c.slug} />
              ))}
            </ul>
          </nav>
        </div>

        <div className="min-w-0 pt-4 lg:col-start-2 lg:row-start-2 lg:pt-1">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-3">
            <p className="tabular text-sm text-ink-muted" aria-live="polite">
              {matching.length === 0 ? "No products" : `Showing ${from}–${to} of ${matching.length}`}
              {query.q ? <> for <span className="font-bold text-ink">&ldquo;{query.q}&rdquo;</span></> : null}
            </p>
            {query.q ? (
              <Link href={href({ category: active?.slug })} className="inline-flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-line-strong bg-raised px-4 text-sm font-semibold text-ink transition-colors hover:bg-sunken">
                <X className="size-3.5" aria-hidden="true" /> Clear search
              </Link>
            ) : (
              <span className="text-sm text-ink-muted">Prices {vat} VAT</span>
            )}
          </div>

          {items.length === 0 ? (
            <PlateMessage
              title="Nothing matches that search"
              action={<LinkButton href={href({ category: active?.slug })} variant="secondary">Clear search</LinkButton>}
            >
              Try a shorter word or check the spelling. If you need something we do not list, tell us in your next order note.
            </PlateMessage>
          ) : (
            <ul className="@container divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised shadow-rest">
              {items.map((p) => (
                <ShopRow key={p.id} product={p} showIncVat={settings.showIncVat} showCategory={!active} />
              ))}
            </ul>
          )}

          <Pagination page={page} pageCount={pageCount} hrefFor={(n) => href({ category: active?.slug, q: query.q, page: n })} />
        </div>
      </div>
    </>
  );
}

/** A shelf: a chip on phones, a row of the left rail on wide screens. The dot is the shelf's ground colour. */
function Chip({ href, current, label, count, ground }: { href: string; current: boolean; label: string; count: number; ground?: string }) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        data-ground={ground}
        className={cn(
          "flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-[background-color,box-shadow,color] duration-[var(--dur-fast)] lg:whitespace-normal lg:rounded-[var(--radius-md)] lg:px-3 lg:py-2",
          current ? "bg-ink text-on-dark" : "bg-sunken text-ink hover:shadow-[inset_0_0_0_1.5px_var(--line-strong)] lg:bg-transparent lg:hover:bg-sunken lg:hover:shadow-none",
        )}
      >
        {ground ? <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full bg-[var(--g)]", current && "ring-2 ring-on-dark/70")} /> : <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full border-[1.5px] border-current" />}
        <span className="min-w-0">{label}</span>
        <span className={cn("tabular text-xs lg:ml-auto", current ? "text-on-dark-muted" : "text-ink-muted")}>{count}</span>
      </Link>
    </li>
  );
}
