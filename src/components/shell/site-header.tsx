import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <Link href="/catalogue" className="hidden rounded-md px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink sm:inline-flex">
            Catalogue
          </Link>
          <Link href="/login" className="whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-ink hover:bg-sunken sm:px-3">
            Sign in
          </Link>
          <LinkButton href="/register" size="sm" className="h-9">
            <span className="sm:hidden">Register</span>
            <span className="hidden sm:inline">Open an account</span>
          </LinkButton>
        </nav>
      </div>
    </header>
  );
}
