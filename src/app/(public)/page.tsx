import Link from "next/link";
import { ArrowRight, Check, ClipboardCheck, ShieldCheck, Tags, Truck, UserPlus } from "lucide-react";
import { brand, whatsappHref } from "@/config/brand";
import { LAUNCH_CATEGORIES } from "@/config/launch-categories";
import { Photo } from "@/components/brand/photo";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { ProductCard } from "@/components/catalogue/product-card";
import { ShelfTile, shelfCount } from "@/components/catalogue/shelf-tile";
import { LinkButton } from "@/components/ui/button";
import { catalogueHref } from "@/lib/catalogue/query";
import { slugify } from "@/lib/import/parse-name";
import { getPublicCategories, searchPublicProducts, type PublicCategory, type PublicProductCard } from "@/server/catalogue";

export const revalidate = 3600;

const h2 = "text-[clamp(1.625rem,1.3rem+1.4vw,2.25rem)] leading-[1.12] text-ink";
const eyebrow = "text-xs font-bold uppercase tracking-[0.12em] text-accent";
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

/** Two products from each of four different categories, so the home page shows range rather than eight kinds of rice. */
async function featuredProducts(categories: HomeCategory[]): Promise<PublicProductCard[]> {
  const stocked = categories.filter((c) => c.productCount > 0);
  const preferred = ["rice", "powders-and-ground-masala", "drinks", "restaurant-packing-and-cleaning"].filter((s) => stocked.some((c) => c.slug === s));
  const rest = stocked.map((c) => c.slug).filter((s) => !preferred.includes(s));
  const picks = [...preferred, ...rest].slice(0, 4);
  try {
    const pages = await Promise.all(picks.map((slug) => searchPublicProducts(slug, [], 1)));
    // Prefer products with a photo, then fill up.
    return pages.flatMap((p) => [...p.items].sort((a, b) => Number(Boolean(b.imagePath)) - Number(Boolean(a.imagePath))).slice(0, 2));
  } catch (e) {
    console.error("home products:", (e as Error).message);
    return [];
  }
}

const promises = [
  { icon: Tags, title: "Your own trade prices", text: "A price list agreed for your business" },
  { icon: Truck, title: "Delivered to your kitchen", text: "Order online, we bring it to your door" },
  { icon: ShieldCheck, title: "Proof of every delivery", text: "Photo and signature on the day" },
  { icon: ClipboardCheck, title: "Fast account approval", text: "Usually the same working day" },
] as const;

const steps = [
  { icon: UserPlus, title: "Open a trade account", text: "Tell us about your restaurant. It takes two minutes and costs nothing." },
  { icon: ClipboardCheck, title: "We approve you", text: "We check your details and set up your own price list, usually the same day." },
  { icon: Truck, title: "Order and receive", text: "Order whenever suits you. We deliver to your kitchen with signed proof of delivery." },
] as const;

export default async function HomePage() {
  const categories = await homeCategories();
  const productTotal = categories.reduce((n, c) => n + c.productCount, 0);
  const featured = await featuredProducts(categories);
  const n = categories.length;

  return (
    <>
      {/* Hero: words on the left, the photograph on the right (above on phones). */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))]">
        <div aria-hidden="true" className="absolute -right-40 -top-40 size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(11_42_91/0.08),transparent)]" />
        <div className={`${wrap} relative grid items-center gap-10 py-10 md:grid-cols-[1.05fr_1fr] md:gap-12 md:py-16 lg:py-20`}>
          <div className="hero-copy order-2 md:order-1">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent-strong">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              Trade wholesale for UK restaurants
            </p>
            <h1 id="hero-title" className="mt-5 max-w-[15ch] text-[clamp(2.25rem,1.5rem+3.4vw,3.75rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-primary">
              Restaurant wholesale, <span className="text-accent">made simple.</span>
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-ink-muted">
              Rice, dal, spices, flours, sauces, drinks and takeaway packaging at your own trade prices. Order online, delivered to your kitchen.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/register" size="lg" variant="accent" className="w-full rounded-full sm:w-auto">
                Open a trade account <ArrowRight className="size-4" aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/catalogue" size="lg" variant="secondary" className="w-full rounded-full sm:w-auto">Browse the catalogue</LinkButton>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
              {["Free to join", "No minimum term", productTotal > 0 ? `${productTotal}+ products` : "Hundreds of products"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-success" strokeWidth={2.5} aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative order-1 md:order-2">
            <div className="hero-photo relative aspect-[4/3] overflow-hidden rounded-[28px] shadow-pop md:aspect-[5/5.2]">
              <Photo slot="home-hero" priority sizes="(min-width: 768px) 50vw, 100vw" className="size-full" focal={{ x: 0.42, y: 0.5 }} />
            </div>
            <div className="hero-card absolute -bottom-5 left-4 flex items-center gap-3 rounded-[var(--radius-lg)] bg-raised px-4 py-3 shadow-pop sm:left-6 md:-left-8 md:bottom-10">
              <span className="grid size-10 place-items-center rounded-full bg-success-soft text-success">
                <Tags className="size-5" aria-hidden="true" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold text-ink">Your own price list</span>
                <span className="text-xs text-ink-muted">Agreed for your restaurant</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section aria-label="Why order with us" className="border-y border-line bg-raised">
        <ul className={`${wrap} grid grid-cols-1 gap-5 py-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6`}>
          {promises.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-primary-soft text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="leading-snug">
                <span className="block text-[15px] font-bold text-ink">{title}</span>
                <span className="text-sm text-ink-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Shop by category */}
      <section aria-labelledby="shelves-title" className={`${wrap} py-14 md:py-20`}>
        <div className="reveal flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className={eyebrow}>The range</p>
            <h2 id="shelves-title" className={`${h2} mt-2`}>Shop by category</h2>
            {productTotal > 0 ? <p className="tabular mt-2 text-base text-ink-muted">{shelfCount(productTotal)} in {n} {n === 1 ? "category" : "categories"}</p> : null}
          </div>
          <Link href="/catalogue" className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary">
            See everything <ArrowRight className="size-4 transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.slug} className="reveal min-w-0">
              <ShelfTile slug={c.slug} name={c.name} count={c.productCount} imagePath={c.imagePath} href={catalogueHref({ category: c.slug })} />
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="steps-title" className="scroll-mt-28 bg-primary text-on-dark-muted" data-surface="dark">
        <div className={`${wrap} on-dark py-14 md:py-20`}>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-sun">How it works</p>
          <h2 id="steps-title" className="mt-2 text-[clamp(1.625rem,1.3rem+1.4vw,2.25rem)] leading-[1.12] text-on-dark">From sign-up to delivery in three steps</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="reveal relative rounded-[var(--radius-xl)] bg-white/[0.06] p-6 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-full bg-accent text-accent-ink">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span aria-hidden="true" className="font-display text-3xl font-extrabold text-sun">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg text-on-dark">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Featured products */}
      {featured.length > 0 ? (
        <section aria-labelledby="now-title" className={`${wrap} py-14 md:py-20`}>
          <div className="reveal flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <p className={eyebrow}>In stock</p>
              <h2 id="now-title" className={`${h2} mt-2`}>Popular with our kitchens</h2>
              <p className="mt-2 text-base text-ink-muted">Prices appear once your trade account is approved.</p>
            </div>
            <Link href="/catalogue" className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary">
              Browse all products <ArrowRight className="size-4 transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* Call to action */}
      <section aria-labelledby="cta-title" className={`${wrap} pb-16 md:pb-24`}>
        <div className="reveal relative overflow-hidden rounded-[28px] bg-accent px-6 py-10 text-accent-ink sm:px-10 md:py-14" data-surface="dark">
          <div aria-hidden="true" className="absolute -right-24 -top-24 size-80 rounded-full bg-white/10" />
          <div aria-hidden="true" className="absolute -bottom-32 right-40 size-72 rounded-full bg-black/10" />
          <div className="on-dark relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 id="cta-title" className="text-[clamp(1.625rem,1.3rem+1.4vw,2.25rem)] leading-[1.12] text-white">Ready to see your prices?</h2>
              <p className="mt-2 max-w-[48ch] text-base text-white/90">Open a free trade account with {brand.name}. Questions first? Message us on WhatsApp.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LinkButton href="/register" size="lg" className="rounded-full !bg-white !text-accent-strong hover:!bg-primary-soft">Open a trade account</LinkButton>
              <a href={whatsappHref("Hello, I would like to know more about a trade account.")} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-base font-semibold text-white ring-1 ring-white/50 transition-colors hover:bg-white/10">
                <WhatsAppIcon className="size-5" /> WhatsApp us
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
