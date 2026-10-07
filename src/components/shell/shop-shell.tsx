import type { ReactNode } from "react";
import Link from "next/link";
import { FileText, Package, Search, ShoppingBasket, Store, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BasketBadge } from "@/components/shop/basket-badge";
import { ToastProvider } from "@/components/ui/toast";
import { NavLink } from "./nav-link";
import { TabIndicator } from "./tab-indicator";

const items = [
  { href: "/shop", label: "Shop", icon: Store, exact: false },
  { href: "/basket", label: "Basket", icon: ShoppingBasket, exact: true },
  { href: "/orders", label: "Orders", icon: Package, exact: false },
  { href: "/invoices", label: "Invoices", icon: FileText, exact: false },
  { href: "/account", label: "Account", icon: UserRound, exact: false },
];
const desktopItems = items.filter((i) => i.href !== "/basket");
const basket = items[1];

/**
 * Restaurant area. Desktop: sticky top bar (logo, search, nav, basket button). Phone: a 56px top bar and a
 * fixed bottom tab bar with labels (thumb reach). The basket count sits in a chilli badge on both.
 */
export function ShopShell({ children, businessName, basketCount = 0, homeHref = "/shop" }: { children: ReactNode; businessName: string; basketCount?: number; homeHref?: string }) {
  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-raised">
          <div className="mx-auto flex h-14 max-w-[75rem] items-center gap-3 px-4 md:h-16 md:gap-4 md:px-6 lg:px-8">
            <Logo href={homeHref} />
            <Link
              href="/shop#shop-q"
              className="ml-2 hidden h-11 w-full max-w-72 items-center gap-2.5 rounded-full border-[1.5px] border-line-strong bg-surface px-4 text-sm text-ink-muted transition-colors hover:bg-sunken md:flex"
            >
              <Search className="size-4 shrink-0" aria-hidden="true" />
              Search products
            </Link>
            <nav aria-label="Account" className="ml-auto hidden items-center gap-1 md:flex">
              {desktopItems.map(({ href, label, icon: Icon, exact }) => (
                <NavLink
                  key={href}
                  href={href}
                  exact={exact}
                  className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] px-3 text-sm font-semibold text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-sunken hover:text-ink"
                  activeClassName="bg-primary-soft !text-primary-strong"
                >
                  <Icon className="size-[18px]" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
              <NavLink
                href={basket.href}
                exact={basket.exact}
                className="ml-2 inline-flex h-11 items-center gap-2.5 rounded-[var(--radius-md)] bg-primary px-4 text-sm font-bold text-primary-ink shadow-[var(--edge-primary)] transition-[background-color,box-shadow,transform] duration-[var(--dur-instant)] hover:bg-primary-strong active:translate-y-[2px] active:shadow-none"
                activeClassName="bg-primary-strong"
              >
                <basket.icon className="size-[18px]" aria-hidden="true" />
                {basket.label}
                <BasketBadge count={basketCount} className="ring-2 ring-[var(--surface-raised)]" />
              </NavLink>
              <SignOutButton iconOnly className="ml-1 grid size-11 place-items-center rounded-[var(--radius-md)] text-ink-muted transition-colors hover:bg-sunken hover:text-ink" />
            </nav>
            <span className="ml-auto max-w-[40%] truncate text-sm font-semibold text-ink-muted md:hidden">{businessName}</span>
            <Link
              href="/shop#shop-q"
              aria-label="Search products"
              className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-sunken active:bg-sunken md:hidden"
            >
              <Search className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[75rem] flex-1 px-4 pb-32 pt-5 md:px-6 md:pb-14 md:pt-8 lg:px-8">
          {children}
        </main>
        <nav
          aria-label="Account"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-raised pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <ul className="relative grid grid-cols-5">
            <TabIndicator items={items.map(({ href, exact }) => ({ href, exact }))} />
            {items.map(({ href, label, icon: Icon, exact }) => (
              <li key={href}>
                <NavLink
                  href={href}
                  exact={exact}
                  className="flex min-h-16 flex-col items-center justify-start gap-0.5 pt-2 text-xs font-semibold text-ink-muted transition-colors active:bg-sunken"
                  activeClassName="!text-ink font-bold"
                >
                  <span className="relative grid h-8 w-14 place-items-center rounded-full">
                    <Icon className="size-[22px]" aria-hidden="true" />
                    {href === "/basket" ? <BasketBadge count={basketCount} className="absolute -right-0.5 -top-1 ring-2 ring-[var(--surface-raised)]" /> : null}
                  </span>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </ToastProvider>
  );
}
