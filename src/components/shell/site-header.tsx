import Link from "next/link";
import { brand, whatsappHref } from "@/config/brand";
import { Logo } from "@/components/brand/logo";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { LinkButton } from "@/components/ui/button";

const textLink =
  "inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-2 text-sm font-semibold text-ink transition-colors duration-[var(--dur-fast)] hover:text-primary sm:px-3";

/** Public header: a thin navy strip (trade only, WhatsApp), then the white bar with the logo and the three things a visitor can do. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-raised/95 shadow-[0_1px_0_var(--line)] backdrop-blur-md">
      <div data-surface="dark" className="on-dark bg-primary text-on-dark-muted">
        <div className="mx-auto flex h-9 max-w-[1200px] items-center justify-between gap-4 px-4 text-xs sm:px-6 lg:px-8">
          <p className="truncate">
            <span className="font-semibold text-on-dark">Trade only</span>
            <span className="hidden sm:inline"> · Wholesale for restaurants, takeaways and caterers across the UK</span>
          </p>
          <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-on-dark transition-opacity hover:opacity-80">
            <WhatsAppIcon className="size-3.5 text-[#25D366]" />
            <span className="max-[380px]:hidden">WhatsApp</span> {brand.contact.phoneDisplay}
          </a>
        </div>
      </div>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-2 px-4 sm:h-[4.5rem] sm:gap-4 sm:px-6 lg:px-8">
        <Logo compact />
        <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
          <Link href="/catalogue" className={`${textLink} max-sm:hidden`}>
            Catalogue
          </Link>
          <Link href="/#how-it-works" className={`${textLink} max-md:hidden`}>
            How it works
          </Link>
          <Link href="/login" className={textLink}>
            Sign in
          </Link>
          <LinkButton href="/register" variant="accent" size="sm" className="ml-1 h-10 rounded-full px-4 text-sm sm:ml-2">
            <span className="min-[421px]:hidden">Register</span>
            <span className="max-[420px]:hidden">Open an account</span>
          </LinkButton>
        </nav>
      </div>
    </header>
  );
}
