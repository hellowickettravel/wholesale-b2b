import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";

const textLink =
  "inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-sm font-semibold text-ink transition-colors duration-[var(--dur-fast)] hover:text-primary sm:px-3 sm:text-base";

/** Public header: enamel bar, wordmark, and the three things a visitor can do. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-raised">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <Logo className="max-[420px]:[&_[aria-hidden=true]]:hidden" />
        <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
          <Link href="/catalogue" className={textLink}>
            Catalogue
          </Link>
          <Link href="/login" className={textLink}>
            Sign in
          </Link>
          <LinkButton href="/register" size="sm" className="ml-1 h-10 px-3 text-sm sm:ml-2 sm:px-4">
            <span className="min-[421px]:hidden">Register</span>
            <span className="max-[420px]:hidden">Open an account</span>
          </LinkButton>
        </nav>
      </div>
    </header>
  );
}
