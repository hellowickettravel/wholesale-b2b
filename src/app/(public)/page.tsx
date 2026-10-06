import Link from "next/link";
import { brand } from "@/config/brand";
import { LAUNCH_CATEGORIES } from "@/config/launch-categories";
import { Photo, hasStockPhoto } from "@/components/brand/photo";
import { ProductCard } from "@/components/catalogue/product-card";
import { PriceLockStrip } from "@/components/catalogue/price-lock";
import { ShelfTile, shelfCount } from "@/components/catalogue/shelf-tile";
import { LinkButton } from "@/components/ui/button";
import { catalogueHref } from "@/lib/catalogue/query";
import { slugify } from "@/lib/import/parse-name";
import { getPublicCategories, searchPublicProducts, type PublicCategory, type PublicProductCard } from "@/server/catalogue";

export const revalidate = 3600;

const h2 = "text-[clamp(1.625rem,1.3rem+1.4vw,2.125rem)] leading-[1.15] text-ink";
const wrap = "mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8";

type HomeCategory = Pick<PublicCategory, "name" | "slug" | "imagePath" | "productCount">;

/** Categories from the database; the launch list if the database cannot be reached. */
async function homeCategories(): Promise<HomeCategory[]> {
  try {
    return await getPublicCategories();
  } catch (e) {
    console.error("home categories:", (e as Error).message);
    return LAUNCH_CATEGORIES.map((name) => ({ name, slug: slugify(name), imagePath: null, productCount: 0 }));
  }
}

/** One product from each of four different shelves, so the home page shows range rather than twenty kinds of rice. */
async function shelvesNow(categories: HomeCategory[]): Promise<PublicProductCard[]> {
  const stocked = categories.filter((c) => c.productCount > 0);
  const preferred = ["rice", "flours-atta-and-rava", "powders-and-ground-masala", "drinks"].filter((s) => stocked.some((c) => c.slug === s));
  const rest = stocked.map((c) => c.slug).filter((s) => !preferred.includes(s));
  const picks = [...preferred, ...rest].slice(0, 4);
  try {
    const pages = await Promise.all(picks.map((slug) => searchPublicProducts(slug, [], 1)));
    return pages.flatMap((p) => p.items.slice(0, 1));
  } catch (e) {
    console.error("home products:", (e as Error).message);
    return [];
  }
}

const facts = [
  ["Your own price list", "Agreed for your restaurant"],
  ["Same-day approval", "Usually, for trade accounts"],
  ["Signed proof of delivery", "Photo and signature on the day"],
  ["Pay by bank transfer", "On delivery or within 7 days"],
] as const;

const steps = [
  ["Open an account", "Tell us about your restaurant. We check and approve trade accounts, usually the same day."],
  ["Get your price list", "Once approved you see the catalogue for your kitchen with the prices agreed for you."],
  ["Order and receive", "Pick a delivery day. Each supplier delivers to your door with signed proof of delivery."],
] as const;

export default async function HomePage() {
  const categories = await homeCategories();
  const productTotal = categories.reduce((n, c) => n + c.productCount, 0);
  const featured = await shelvesNow(categories);
  const n = categories.length;

  return (
    <>
      {/* Hero: the photograph, with the enamel plate hung over it. */}
      <section aria-labelledby="hero-title" className="relative">
        <div className="relative h-[380px] overflow-hidden bg-dark md:h-[620px]">
          <div className="hero-photo absolute inset-0">
            <Photo slot="home-hero" priority sizes="100vw" className="size-full" focal={{ x: 0.42, y: 0.5 }} />
          </div>
        </div>
        <div className="relative z-10 -mt-[72px] px-4 md:absolute md:inset-x-0 md:bottom-14 md:mt-0 md:px-0">
          <div className="mx-auto max-w-[1200px] md:px-8">
            <div className="hero-plate plate relative max-w-[34rem] p-[22px] [--rim:var(--ground-rice)] sm:p-8 md:p-9">
              <span aria-hidden="true" className="absolute left-3.5 top-3.5 size-2.5 rounded-full bg-hessian shadow-[inset_0_0_0_1px_rgb(42_28_20/0.4)] after:absolute after:inset-x-px after:top-1/2 after:h-px after:-rotate-[35deg] after:bg-ink/50" />
              <span aria-hidden="true" className="absolute right-3.5 top-3.5 size-2.5 rounded-full bg-hessian shadow-[inset_0_0_0_1px_rgb(42_28_20/0.4)] after:absolute after:inset-x-px after:top-1/2 after:h-px after:rotate-[35deg] after:bg-ink/50" />
              <h1 id="hero-title" className="max-w-[18ch] text-[clamp(2.125rem,1.4rem+3.6vw,3.75rem)] leading-[1.05] text-ink">
                Your kitchen&rsquo;s dry store, on one account.
              </h1>
              <p className="mt-4 max-w-[34ch] text-base text-ink-muted sm:text-lg">
                Rice, dal, spices, tea and packaging, at the prices agreed for your restaurant.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/register" size="lg" className="w-full sm:w-auto">Open a trade account</LinkButton>
                <LinkButton href="/catalogue" size="lg" variant="secondary" className="w-full sm:w-auto">Browse the catalogue</LinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Facts: plain text on kraft. Only what the business has actually said. */}
      <section aria-label="How we trade" className="mt-8 bg-sunken md:mt-0">
        <ul className={`${wrap} grid grid-cols-2 gap-x-5 gap-y-5 py-6 lg:grid-cols-4 lg:gap-0 lg:py-7`}>
          {facts.map(([title, text], i) => (
            <li key={title} className={i > 0 ? "lg:border-l lg:border-dashed lg:border-line-strong lg:pl-6" : "lg:pr-6"}>
              <p className="text-base font-bold leading-snug text-ink">{title}</p>
              <p className="mt-0.5 text-sm text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Shop by shelf */}
      <section aria-labelledby="shelves-title" className={`${wrap} py-12 md:py-[4.5rem]`}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h2 id="shelves-title" className={h2}>Shop by shelf</h2>
            {productTotal > 0 ? <p className="tabular mt-1.5 text-base text-ink-muted">{shelfCount(productTotal)} on {n} {n === 1 ? "shelf" : "shelves"}</p> : null}
          </div>
          <Link href="/catalogue" className="inline-flex min-h-11 items-center text-base font-bold text-primary underline-offset-4 hover:underline">
            See everything
          </Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {categories.map((c, i) => {
            const last = i === categories.length - 1;
            // Keep the last row full: a lone tile spans the row on phones, and a short last row on desktop is widened.
            const span = [last && n % 2 === 1 ? "col-span-2" : "", last ? (n % 4 === 3 ? "lg:col-span-2" : "lg:col-span-1") : ""].join(" ");
            return (
              <li key={c.slug} className={`min-w-0 ${span}`}>
                <ShelfTile slug={c.slug} name={c.name} count={c.productCount} imagePath={c.imagePath} href={catalogueHref({ category: c.slug })} />
              </li>
            );
          })}
        </ul>
      </section>

      {/* A second photograph, only once one has been supplied (slot home-abundance). */}
      {hasStockPhoto("home-abundance") ? <Photo slot="home-abundance" box="ratio" fallback="none" sizes="100vw" className="max-h-[360px] w-full" /> : null}

      {/* The sequence */}
      <section aria-labelledby="steps-title" className="bg-sunken">
        <div className={`${wrap} py-12 md:py-[4.5rem]`}>
          <h2 id="steps-title" className={h2}>How it works</h2>
          <ol className="mt-8 grid gap-9 md:grid-cols-3 md:gap-10">
            {steps.map(([title, text], i) => (
              <li key={title} className="relative pl-[3.75rem] md:pl-0 md:pt-[3.75rem]">
                <span className="absolute left-0 top-0 z-10 grid size-11 place-items-center rounded-full bg-accent font-display text-xl text-accent-ink">{i + 1}</span>
                {i < steps.length - 1 ? (
                  <span aria-hidden="true" className="absolute left-[21px] top-11 h-[calc(100%-0.25rem)] border-l-2 border-dashed border-line-strong md:left-11 md:top-[21px] md:h-0 md:w-[calc(100%+0.5rem)] md:border-l-0 md:border-t-2" />
                ) : null}
                <h3 className="text-xl text-ink">{title}</h3>
                <p className="mt-1.5 max-w-[34ch] text-base text-ink-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* On the shelves now */}
      {featured.length > 0 ? (
        <section aria-labelledby="now-title" className={`${wrap} py-12 md:py-[4.5rem]`}>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h2 id="now-title" className={h2}>On the shelves now</h2>
            <Link href="/catalogue" className="inline-flex min-h-11 items-center text-base font-bold text-primary underline-offset-4 hover:underline">
              Browse all products
            </Link>
          </div>
          <PriceLockStrip className="mt-4">
            <p>Prices appear once your trade account is approved.</p>
          </PriceLockStrip>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* Call to action */}
      <section aria-labelledby="cta-title" className="on-dark bg-primary text-on-dark-muted" data-surface="dark">
        <div className={`${wrap} flex flex-col items-start justify-between gap-6 py-12 sm:flex-row sm:items-center md:py-14`}>
          <div>
            <h2 id="cta-title" className="text-[clamp(1.625rem,1.3rem+1.4vw,2.125rem)] leading-[1.15] text-on-dark">Ready to see your prices?</h2>
            <p className="mt-2 max-w-[44ch] text-base">Open a free trade account with {brand.name}. No minimum term.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <LinkButton href="/register" size="lg" variant="accent">Open a trade account</LinkButton>
            <Link href="/login" className="inline-flex min-h-11 items-center text-base font-bold text-on-dark underline underline-offset-4">Sign in</Link>
          </div>
        </div>
      </section>
    </>
  );
}
