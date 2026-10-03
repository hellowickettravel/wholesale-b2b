import Link from "next/link";
import { ArrowRight, BadgePercent, FileText, Landmark, Lock, Truck } from "lucide-react";
import { brand } from "@/config/brand";
import { LAUNCH_CATEGORIES } from "@/config/launch-categories";
import { LinkButton } from "@/components/ui/button";
import { slugify } from "@/lib/import/parse-name";

const ticket = [
  { name: "Basmati Rice", size: "20 kg", qty: 4, supplier: "A" },
  { name: "Toor Dal", size: "5 kg", qty: 6, supplier: "A" },
  { name: "Garam Masala", size: "1 kg", qty: 2, supplier: "B" },
  { name: "Mango Drink", size: "330 ml × 24", qty: 3, supplier: "B" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-accent-soft blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-raised px-3 py-1 text-xs font-semibold text-ink-muted">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" /> Trade accounts for restaurants
            </p>
            <h1 className="mt-5 text-[40px] font-extrabold leading-[1.05] text-ink sm:text-[56px]">
              Your kitchen&rsquo;s dry store, on <span className="relative whitespace-nowrap text-primary">one account<svg aria-hidden="true" viewBox="0 0 220 12" className="absolute -bottom-2 left-0 w-full text-accent"><path d="M2 9c50-6 120-8 216-3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg></span>.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-muted">
              Rice, dal, spices, tea, sauces, drinks and packaging from established UK wholesalers.
              Order in a minute, at the prices agreed for your restaurant.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/register" size="lg">
                Open a trade account <ArrowRight className="size-4" aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/catalogue" size="lg" variant="secondary">
                Browse the catalogue
              </LinkButton>
            </div>
            <p className="mt-4 text-sm text-ink-subtle">Already trading with us? <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/login">Sign in</Link></p>
          </div>

          {/* Order ticket visual: deliberately shows no prices */}
          <div className="relative mx-auto w-full max-w-sm md:mx-0 md:justify-self-end">
            <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 rounded-[var(--radius-xl)] bg-primary" />
            <figure className="relative rounded-[var(--radius-xl)] border border-ink/10 bg-raised p-5 shadow-[0_20px_50px_-20px_rgba(24,33,29,0.35)]">
              <figcaption className="flex items-center justify-between border-b border-dashed border-line-strong pb-3">
                <span className="font-display text-sm font-bold text-ink">Order #1051</span>
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">Delivery Tue 6 Oct</span>
              </figcaption>
              <ul className="divide-y divide-line">
                {ticket.map((t) => (
                  <li key={t.name} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="tabular grid size-7 shrink-0 place-items-center rounded-md bg-sunken text-xs font-bold text-ink">{t.qty}×</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{t.name}</span>
                      <span className="text-xs text-ink-muted">{t.size} · Supplier {t.supplier}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-subtle">
                      <Lock className="size-3" aria-hidden="true" /> £
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 rounded-[var(--radius-md)] bg-accent-soft px-3 py-2.5 text-center text-sm font-semibold text-accent-ink">
                Register to see your prices
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">How it works</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Open an account", "Tell us about your restaurant. We check and approve trade accounts, usually the same day."],
            ["Get your price list", "Once approved you see the catalogue for your kitchen with the prices agreed for you."],
            ["Order and receive", "Pick a delivery day. Each supplier delivers to your door with signed proof of delivery."],
          ].map(([title, text], i) => (
            <li key={title} className="rounded-[var(--radius-lg)] border border-line bg-raised p-6">
              <span className="font-display text-4xl font-extrabold text-accent">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Categories */}
      <section className="border-y border-line bg-raised">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">What you can order</h2>
              <p className="mt-1 text-ink-muted">Hundreds of lines across {LAUNCH_CATEGORIES.length} categories.</p>
            </div>
            <Link href="/catalogue" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              See everything <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {LAUNCH_CATEGORIES.map((c) => (
              <li key={c}>
                <Link
                  href={`/catalogue?category=${slugify(c)}`}
                  className="group flex h-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-4 text-[15px] font-semibold text-ink transition-colors hover:border-primary hover:bg-primary-soft"
                >
                  {c}
                  <ArrowRight className="size-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Built for how restaurants buy</h2>
        <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2">
          {[
            [BadgePercent, "Your own price list", "Prices are agreed per restaurant and stay on your account. Reorder your usual lines in seconds."],
            [Truck, "Delivered by the wholesaler", "Your order goes straight to the supplier holding the stock, who delivers with photo and signed proof."],
            [Landmark, "Pay by bank transfer", "Pay on delivery, within 7 days or on a date you choose. Every order has a clear reference."],
            [FileText, "An invoice for every order", "VAT shown line by line. Download any invoice from your order history."],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Truck;
            return (
              <div key={title as string} className="flex gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-primary-soft text-primary">
                  <I className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{title as string}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">{text as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-[var(--radius-xl)] bg-primary px-6 py-10 text-primary-ink sm:flex-row sm:items-center sm:px-10">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to see your prices?</h2>
            <p className="mt-1 text-white/75">Open a free trade account with {brand.name}. No minimum term.</p>
          </div>
          <LinkButton href="/register" size="lg" variant="accent">
            Open a trade account <ArrowRight className="size-4" aria-hidden="true" />
          </LinkButton>
        </div>
      </section>
    </>
  );
}
