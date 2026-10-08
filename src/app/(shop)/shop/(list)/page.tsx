import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronRight, Package, Search, ShoppingBasket, X } from "lucide-react";
import { whatsappHref } from "@/config/brand";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { CategoryIcon } from "@/components/catalogue/category-icon";
import { PlateMessage } from "@/components/shop/plate-message";
import { ShopTitle } from "@/components/shop/page-title";
import { SearchFocus } from "@/components/shop/search-focus";
import { ShopCard } from "@/components/shop/shop-card";
import { SortSelect } from "@/components/shop/sort-select";
import { LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { CATALOGUE_PAGE_SIZE, matchesWords, parseCatalogueQuery } from "@/lib/catalogue/query";
import { cn } from "@/lib/cn";
import { requireRole } from "@/server/auth";
import { displayPence, getShopSettings, listShopProducts, type ShopProduct } from "@/server/shop";

export const metadata: Metadata = { title: "Shop" };

const SORTS = [
  { value: "", label: "Recommended" },
  { value: "az", label: "Name A to Z" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

/** Lowest price the restaurant pays for any size (null when nothing is priced). */
function fromPrice(p: ShopProduct, inc: boolean): number | null {
  const prices = p.variants.map((v) => displayPence(v, inc)).filter((n): n is number => n !== null);
  return prices.length ? Math.min(...prices) : null;
}

export default async function ShopHome({ searchParams }: PageProps<"/shop">) {
  const viewer = await requireRole("customer");
  const customerId = viewer.customer!.id;
  const sp = await searchParams;
  const query = parseCatalogueQuery(sp);
  const rawSort = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort: Sort = SORTS.some((s) => s.value === rawSort) ? (rawSort as Sort) : "";
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
  if (sort === "az") matching.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "price-asc" || sort === "price-desc") {
    const dir = sort === "price-asc" ? 1 : -1;
    const key = (p: ShopProduct) => fromPrice(p, settings.showIncVat);
    // Unpriced products always go last.
    matching.sort((a, b) => {
      const x = key(a), y = key(b);
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      return (x - y) * dir;
    });
  }
  const pageCount = Math.max(1, Math.ceil(matching.length / CATALOGUE_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const items = matching.slice((page - 1) * CATALOGUE_PAGE_SIZE, page * CATALOGUE_PAGE_SIZE);
  const from = matching.length === 0 ? 0 : (page - 1) * CATALOGUE_PAGE_SIZE + 1;
  const to = Math.min(matching.length, page * CATALOGUE_PAGE_SIZE);
  const href = (q: { category?: string | null; q?: string; page?: number; sort?: string }) => {
    const u = new URLSearchParams();
    if (q.category) u.set("category", q.category);
    if (q.q) u.set("q", q.q);
    if (q.sort) u.set("sort", q.sort);
    if (q.page && q.page > 1) u.set("page", String(q.page));
    const s = u.toString();
    return s ? `/shop?${s}` : "/shop";
  };
  const vat = settings.showIncVat ? "include" : "exclude";
  const welcome = !active && !query.q && page === 1;

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

      {welcome ? (
        <section aria-labelledby="welcome-title" className="relative mb-6 overflow-hidden rounded-[var(--radius-xl)] bg-primary px-5 py-6 text-on-dark-muted sm:mb-8 sm:px-8 sm:py-8" data-surface="dark">
          <div aria-hidden="true" className="absolute -right-16 -top-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(216_31_38/0.55),transparent)] sm:-top-20 sm:size-96" />
          <div aria-hidden="true" className="absolute -bottom-28 right-24 hidden size-64 rounded-full bg-[radial-gradient(closest-side,rgb(255_197_50/0.25),transparent)] md:block" />
          <div className="on-dark relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sun">Welcome back</p>
              <h1 id="welcome-title" className="mt-1 text-[clamp(1.625rem,1.3rem+1.6vw,2.375rem)] leading-tight text-on-dark">{viewer.customer!.businessName}</h1>
              <p className="mt-2 max-w-[52ch] text-[15px]">
                {all.length} products at your account prices. Prices {vat} VAT. Order today and we will confirm your delivery.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/orders" className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-on-dark ring-1 ring-white/20 transition-colors hover:bg-white/20">
                <Package className="size-4" aria-hidden="true" /> Your orders
              </Link>
              <a href={whatsappHref(`Hello, this is ${viewer.customer!.businessName}.`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft">
                <WhatsAppIcon className="size-4 text-[#1DA851]" /> Ask on WhatsApp
              </a>
            </div>
          </div>
        </section>
      ) : (
        <header className="mb-4 sm:mb-6">
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-sm text-ink-muted">
            <Link href="/shop" className="hover:text-primary hover:underline">Shop</Link>
            {active ? (
              <>
                <ChevronRight className="size-3.5" aria-hidden="true" />
                <span className="text-ink">{active.name}</span>
              </>
            ) : null}
          </nav>
          <div className="flex items-center gap-3">
            {active ? (
              <span data-ground={active.slug} className="weave grid size-12 shrink-0 place-items-center rounded-[var(--radius-md)]">
                <CategoryIcon slug={active.slug} className="size-6" />
              </span>
            ) : null}
            <h1 className="text-[clamp(1.625rem,1.3rem+1.6vw,2.375rem)] leading-tight text-ink">
              {query.q ? <>Results for &ldquo;{query.q}&rdquo;</> : (active?.name ?? "All products")}
            </h1>
          </div>
        </header>
      )}

      {/* Phones: search and categories (wide screens have both in the header). */}
      <div className="md:hidden">
        <form action="/shop" role="search" className="relative">
          {active ? <input type="hidden" name="category" value={active.slug} /> : null}
          <label htmlFor="shop-q" className="sr-only">Search your catalogue</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            id="shop-q"
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder={active ? `Search ${active.name.toLowerCase()}` : "Search rice, dal, spices…"}
            className="block h-12 w-full rounded-full border border-line bg-raised pl-11 pr-4 text-base text-ink shadow-rest placeholder:text-ink-subtle focus:border-primary focus:shadow-[0_0_0_3px_rgb(37_99_235/0.15)] focus:outline-none"
          />
        </form>
        <nav aria-label="Categories" className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none]">
          <ul className="flex gap-2 pr-4">
            <Chip href={href({ q: query.q, sort })} current={!active} label="All" count={all.length} />
            {categories.map((c) => (
              <Chip key={c.slug} href={href({ category: c.slug, q: query.q, sort })} current={active?.slug === c.slug} label={c.name} count={c.count} ground={c.slug} />
            ))}
          </ul>
        </nav>
      </div>

      <form action="/shop" className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line pb-4 md:mt-0">
        {active ? <input type="hidden" name="category" value={active.slug} /> : null}
        {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
        <p className="tabular text-sm text-ink-muted" aria-live="polite">
          {matching.length === 0 ? "No products" : <>Showing <span className="font-semibold text-ink">{from}–{to}</span> of {matching.length}</>}
          <span className="hidden sm:inline"> · prices {vat} VAT</span>
        </p>
        <div className="flex items-center gap-2">
          {query.q ? (
            <Link href={href({ category: active?.slug, sort })} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-raised px-4 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary">
              <X className="size-3.5" aria-hidden="true" /> Clear search
            </Link>
          ) : null}
          <SortSelect value={sort} options={[...SORTS]} label="Sort products" />
          <noscript>
            <button type="submit" className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-ink">Sort</button>
          </noscript>
        </div>
      </form>

      {items.length === 0 ? (
        <PlateMessage
          className="mt-6"
          title="Nothing matches that search"
          action={<LinkButton href={href({ category: active?.slug })} variant="secondary">Clear search</LinkButton>}
        >
          Try a shorter word or check the spelling. Need something we do not list? Message us on WhatsApp and we will source it.
        </PlateMessage>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((p, i) => (
            <ShopCard key={p.id} product={p} showIncVat={settings.showIncVat} priority={i < 4} />
          ))}
        </ul>
      )}

      <Pagination page={page} pageCount={pageCount} hrefFor={(n) => href({ category: active?.slug, q: query.q, sort, page: n })} />

      {welcome && categories.length > 1 ? (
        <section aria-labelledby="browse-title" className="mt-12">
          <h2 id="browse-title" className="text-xl text-ink">Browse by category</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={href({ category: c.slug })} data-ground={c.slug} className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-raised p-3 transition-[box-shadow,border-color] duration-[var(--dur-base)] hover:border-transparent hover:shadow-lift">
                  <span className="weave grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)]">
                    <CategoryIcon slug={c.slug} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-ink">{c.name}</span>
                    <span className="tabular text-xs text-ink-muted">{c.count} products</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-ink-subtle transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link
        href="/basket"
        className="mt-10 hidden items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline md:flex"
      >
        <ShoppingBasket className="size-4" aria-hidden="true" /> Go to your basket
      </Link>
    </>
  );
}

/** A category chip on phones. The dot is the category colour. */
function Chip({ href, current, label, count, ground }: { href: string; current: boolean; label: string; count: number; ground?: string }) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        data-ground={ground}
        className={cn(
          "flex h-10 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors duration-[var(--dur-fast)]",
          current ? "border-primary bg-primary text-primary-ink" : "border-line bg-raised text-ink hover:border-primary",
        )}
      >
        {ground ? <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full bg-[var(--g)]", current && "ring-2 ring-white/70")} /> : null}
        <span>{label}</span>
        <span className={cn("tabular text-xs", current ? "text-on-dark-muted" : "text-ink-muted")}>{count}</span>
      </Link>
    </li>
  );
}
