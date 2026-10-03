import type { ReactNode } from "react";
import { FileText, Package, ShoppingBasket, Store, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NavLink } from "./nav-link";

const items = [
  { href: "/shop", label: "Shop", icon: Store, exact: false },
  { href: "/basket", label: "Basket", icon: ShoppingBasket, exact: true },
  { href: "/orders", label: "Orders", icon: Package, exact: false },
  { href: "/invoices", label: "Invoices", icon: FileText, exact: false },
  { href: "/account", label: "Account", icon: UserRound, exact: false },
];

/**
 * Restaurant area. Desktop: top bar with inline nav. Phone: compact top bar + fixed bottom
 * tab bar (thumb reach). `basketCount` badge on the basket tab.
 */
export function ShopShell({ children, businessName, basketCount = 0, homeHref = "/shop" }: { children: ReactNode; businessName: string; basketCount?: number; homeHref?: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-raised/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <Logo href={homeHref} />
          <nav aria-label="Account" className="hidden items-center gap-1 md:flex">
            {items.map(({ href, label, icon: Icon, exact }) => (
              <NavLink
                key={href}
                href={href}
                exact={exact}
                className="relative inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-ink-muted hover:bg-sunken hover:text-ink"
                activeClassName="bg-primary-soft !text-primary-strong"
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
                {href === "/basket" && basketCount > 0 ? (
                  <span className="tabular rounded-full bg-accent px-1.5 text-xs font-bold text-accent-ink">{basketCount}</span>
                ) : null}
              </NavLink>
            ))}
            <SignOutButton iconOnly className="ml-1 rounded-[var(--radius-md)] p-2 text-ink-muted hover:bg-sunken hover:text-ink" />
          </nav>
          <span className="max-w-[45%] truncate text-sm font-medium text-ink-muted md:hidden">{businessName}</span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12">
        {children}
      </main>
      <nav
        aria-label="Account"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {items.map(({ href, label, icon: Icon, exact }) => (
            <li key={href}>
              <NavLink
                href={href}
                exact={exact}
                className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-muted"
                activeClassName="!text-primary"
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
                {href === "/basket" && basketCount > 0 ? (
                  <span className="tabular absolute right-[22%] top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 text-accent-ink">
                    {basketCount}
                  </span>
                ) : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
