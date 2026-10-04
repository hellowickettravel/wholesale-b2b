import type { Metadata } from "next";
import Link from "next/link";
import { PackageOpen, Search, X } from "lucide-react";
import { ShopRow } from "@/components/shop/shop-row";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

  if (all.length === 0) {
    return (
      <>
        <Header eyebrow={viewer.customer!.businessName} />
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-raised">
          <EmptyState icon={<PackageOpen />} title="We are still setting up your catalogue">
            Your account is approved. We are choosing the products and prices for your kitchen and will let you know when ordering opens.
          </EmptyState>
        </div>
      </>
    );
  }

  return (
    <>
      <Header eyebrow={viewer.customer!.businessName}>
        <form action="/shop" role="search" className="flex w-full gap-2 sm:w-96">
          {active ? <input type="hidden" name="category" value={active.slug} /> : null}
          <label htmlFor="shop-q" className="sr-only">Search your catalogue</label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
            <input
              id="shop-q"
              name="q"
              type="search"
              defaultValue={query.q}
              placeholder={active ? `Search ${active.name.toLowerCase()}` : "Search, e.g. basmati, toor dal"}
              className="block h-11 w-full rounded-[var(--radius-md)] border border-line-strong bg-raised pl-9 pr-3 text-[15px] text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-10"
            />
          </div>
          <button type="submit" className="h-11 rounded-[var(--radius-md)] bg-primary px-4 text-sm font-semibold text-primary-ink hover:bg-primary-strong sm:h-10">
            Search
          </button>
        </form>
      </Header>

      <nav aria-label="Categories" className="-mx-4 mb-4 sm:mx-0">
        <ul className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-0">
          <Chip href={href({ q: query.q })} current={!active} label="All" count={all.length} />
          {categories.map((c) => (
            <Chip key={c.slug} href={href({ category: c.slug, q: query.q })} current={active?.slug === c.slug} label={c.name} count={c.count} />
          ))}
        </ul>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <p className="tabular text-sm text-ink-muted" aria-live="polite">
          {matching.length === 0 ? "No products" : `Showing ${from}–${to} of ${matching.length}`}
          {query.q ? <> for <span className="font-semibold text-ink">&ldquo;{query.q}&rdquo;</span></> : null}
          <span className="text-ink-subtle"> · prices {settings.showIncVat ? "include" : "exclude"} VAT</span>
        </p>
        {query.q ? (
          <Link href={href({ category: active?.slug })} className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-raised px-3 py-1 text-sm font-medium text-ink hover:bg-sunken">
            <X className="size-3.5" aria-hidden="true" /> Clear search
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-raised">
          <EmptyState
            icon={<PackageOpen />}
            title="Nothing matches that search"
            action={<LinkButton href={href({ category: active?.slug })} variant="secondary">Clear search</LinkButton>}
          >
            Try a shorter word or check the spelling. If you need something we do not list, tell us in your next order note.
          </EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
          {items.map((p) => (
            <ShopRow key={p.id} product={p} showIncVat={settings.showIncVat} showCategory={!active} />
          ))}
        </ul>
      )}

      <Pagination page={page} pageCount={pageCount} hrefFor={(n) => href({ category: active?.slug, q: query.q, page: n })} />
    </>
  );
}

function Header({ eyebrow, children }: { eyebrow: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-1 truncate text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{eyebrow}</div>
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">Your catalogue</h1>
      </div>
      {children}
    </div>
  );
}

function Chip({ href, current, label, count }: { href: string; current: boolean; label: string; count: number }) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
          current ? "border-primary bg-primary text-primary-ink" : "border-line-strong bg-raised text-ink hover:bg-sunken",
        )}
      >
        {label}
        <span className={cn("tabular text-xs", current ? "opacity-80" : "text-ink-subtle")}>{count}</span>
      </Link>
    </li>
  );
}
