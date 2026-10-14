import type { ReactNode } from "react";
import Link from "next/link";
import { brand } from "@/config/brand";

/** Last time any of the three legal pages was reviewed. Update with the text. */
export const LEGAL_UPDATED = "14 October 2026";

const NAV = [
  { href: "/terms", label: "Terms of trade" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/cookies", label: "Cookies" },
];

/** Shared frame for the Terms, Privacy and Cookies pages: readable column, a small contents list, same company details. */
export function LegalPage({ title, intro, current, sections }: { title: string; intro: string; current: string; sections: { id: string; heading: string; body: ReactNode }[] }) {
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <nav aria-label="Legal pages" className="mb-6 flex flex-wrap gap-2 text-sm">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={n.href === current ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 font-semibold ${n.href === current ? "border-primary bg-primary text-on-dark" : "border-line bg-raised text-ink-muted hover:text-ink"}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <h1 className="text-[clamp(1.75rem,1.3rem+2vw,2.5rem)] font-bold leading-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated {LEGAL_UPDATED}</p>
      <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-ink-muted">{intro}</p>

      <div className="mt-8 grid gap-10 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="md:sticky md:top-24 md:self-start">
          <ol className="space-y-1.5 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a className="text-ink-muted underline-offset-4 hover:text-primary hover:underline" href={`#${s.id}`}>{i + 1}. {s.heading}</a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="max-w-[68ch] space-y-9">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28">
              <h2 id={`${s.id}-h`} className="text-xl font-bold text-ink">{i + 1}. {s.heading}</h2>
              <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-muted [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">{s.body}</div>
            </section>
          ))}
          <p className="border-t border-line pt-6 text-sm text-ink-muted">
            {brand.tradingAs} Questions about this page: <a className="font-semibold text-primary underline" href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
