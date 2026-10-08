import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Photo } from "@/components/brand/photo";

/**
 * Sign-in, registration and password screens. Phone: a white bar with the logo, then one calm column.
 * Desktop: the form on the left and, on the right, a photograph under a navy fade that stays put while the
 * form scrolls (full height, so there is no seam), with one line of copy on it.
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
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-[72px] items-center justify-between gap-4 border-b border-line bg-raised px-4 sm:px-8 lg:h-20 lg:border-0 lg:bg-transparent">
          <Logo />
          <Link href="/catalogue" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Browse catalogue
          </Link>
        </header>
        <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:px-8 lg:items-center lg:py-10">
          <div className={wide ? "w-full max-w-2xl" : "w-full max-w-md"}>
            <h1 className="text-[clamp(1.75rem,1.4rem+1.6vw,2.5rem)] leading-[1.08] tracking-[-0.03em] text-ink">{title}</h1>
            {description ? <div className="mt-3 max-w-prose text-base text-ink-muted sm:text-lg">{description}</div> : null}
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-8 border-t border-line pt-6 text-base text-ink-muted">{footer}</div> : null}
          </div>
        </main>
      </div>

      <aside aria-hidden="true" className="relative hidden overflow-hidden lg:sticky lg:top-0 lg:block lg:h-dvh lg:self-start">
        <Photo slot="auth-side" className="absolute inset-0" sizes="2200px" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_42_91/0.15)_0%,rgb(11_42_91/0.35)_45%,rgb(7_29_66/0.92)_100%)]" />
        <div className="absolute inset-x-10 bottom-12 xl:inset-x-14">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-sun" /> Trade wholesale
          </p>
          <p className="mt-4 max-w-md font-display text-[clamp(1.75rem,1.2rem+1.2vw,2.5rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-white">
            Your prices. Your orders. Delivered to your kitchen.
          </p>
          <p className="mt-3 max-w-sm text-base text-white/85">Every order and invoice stays in your account, ready when you need it.</p>
        </div>
      </aside>
    </div>
  );
}
