import type { ReactNode } from "react";
import Link from "next/link";
import { BadgePercent, FileText, Truck } from "lucide-react";
import { brand } from "@/config/brand";
import { Logo } from "@/components/brand/logo";

/**
 * Sign-in, registration and password screens. Phone: one calm column. Desktop: form on the
 * left, brand panel on the right (decorative, so it is hidden from assistive tech).
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
  wide,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <Logo />
          <Link href="/catalogue" className="text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline">
            Browse catalogue
          </Link>
        </header>
        <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:px-8 sm:pt-0">
          <div className={wide ? "w-full max-w-xl" : "w-full max-w-sm"}>
            <h1 className="text-[28px] font-extrabold leading-tight text-ink sm:text-[32px]">{title}</h1>
            {description ? <div className="mt-2 text-[15px] leading-relaxed text-ink-muted">{description}</div> : null}
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-8 border-t border-line pt-6 text-sm text-ink-muted">{footer}</div> : null}
          </div>
        </main>
      </div>

      <aside aria-hidden="true" className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-primary-strong" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-[360px] rounded-full bg-accent/15" />
        <div className="relative">
          <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-accent">Trade accounts</p>
          <p className="mt-4 max-w-md font-display text-[34px] font-extrabold leading-[1.1] text-white">
            One order. Every supplier. Your own prices.
          </p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">{brand.tagline}</p>
        </div>
        <ul className="relative space-y-4 text-[15px] text-white/85">
          {[
            [BadgePercent, "Prices agreed for your restaurant, shown ex VAT with VAT itemised"],
            [Truck, "Split automatically to the right wholesaler and delivered to your door"],
            [FileText, "Every order and invoice kept in your account"],
          ].map(([Icon, text]) => {
            const I = Icon as typeof Truck;
            return (
              <li key={text as string} className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] bg-white/10">
                  <I className="size-4 text-accent" />
                </span>
                <span className="pt-1">{text as string}</span>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
