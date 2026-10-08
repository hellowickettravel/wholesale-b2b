import type { ReactNode } from "react";
import Link from "next/link";
import { FileText, Mail, Package, Search, ShoppingBasket, Store, UserRound } from "lucide-react";
import { brand, whatsappHref } from "@/config/brand";
import { Logo } from "@/components/brand/logo";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BasketBadge } from "@/components/shop/basket-badge";
import { ToastProvider } from "@/components/ui/toast";
import { CategoryNav, type NavCategory } from "./category-nav";
import { NavLink } from "./nav-link";
import { TabIndicator } from "./tab-indicator";

const items = [
  { href: "/shop", label: "Shop", icon: Store, exact: false },
  { href: "/basket", label: "Basket", icon: ShoppingBasket, exact: true },
  { href: "/orders", label: "Orders", icon: Package, exact: false },
  { href: "/invoices", label: "Invoices", icon: FileText, exact: false },
  { href: "/account", label: "Account", icon: UserRound, exact: false },
];
const desktopItems = items.filter((i) => i.href !== "/basket" && i.href !== "/shop");
const basket = items[1];

/**
 * Restaurant area.
 * Wide screens: a thin navy strip (who is ordering, how to reach us), the white bar (logo, a real search box,
 * orders/invoices/account, the red basket button) and the category bar.
 * Phones: a 56px top bar and a fixed bottom tab bar with labels (thumb reach); the shop page has its own search.
 */
export function ShopShell({
  children,
  businessName,
  basketCount = 0,
  homeHref = "/shop",
  categories = [],
}: {
  children: ReactNode;
  businessName: string;
  basketCount?: number;
  homeHref?: string;
  categories?: NavCategory[];
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 bg-raised shadow-[0_1px_0_var(--line)]">
          <div data-surface="dark" className="on-dark hidden bg-primary text-on-dark-muted md:block">
            <div className="mx-auto flex h-9 max-w-[80rem] items-center justify-between gap-6 px-6 text-xs lg:px-8">
              <p className="truncate">
                Trade account: <span className="font-semibold text-on-dark">{businessName}</span>
              </p>
              <div className="flex shrink-0 items-center gap-5">
                <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-on-dark transition-opacity hover:opacity-80">
                  <WhatsAppIcon className="size-3.5 text-[#25D366]" />
                  WhatsApp {brand.contact.phoneDisplay}
                </a>
                <a href={`mailto:${brand.contact.email}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-on-dark">
                  <Mail className="size-3.5" aria-hidden="true" />
                  {brand.contact.email}
                </a>
              </div>
            </div>
          </div>

          <div className="mx-auto flex h-14 max-w-[80rem] items-center gap-3 px-4 md:h-[4.5rem] md:gap-6 md:px-6 lg:px-8">
            <Logo href={homeHref} />
            <form action="/shop" role="search" className="relative hidden flex-1 md:block md:max-w-xl lg:max-w-2xl">
              <label htmlFor="header-q" className="sr-only">Search products</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                id="header-q"
                name="q"
                type="search"
                placeholder="Search rice, dal, spices, packaging…"
                className="block h-11 w-full rounded-full border border-line bg-surface pl-11 pr-24 text-[15px] text-ink transition-[border-color,background-color,box-shadow] duration-[var(--dur-fast)] placeholder:text-ink-subtle hover:border-line-strong/60 focus:border-primary focus:bg-raised focus:shadow-[0_0_0_3px_rgb(37_99_235/0.15)] focus:outline-none"
              />
              <button type="submit" className="absolute right-1 top-1 h-9 rounded-full bg-primary px-4 text-sm font-semibold text-primary-ink transition-colors hover:bg-primary-strong">
                Search
              </button>
            </form>
            <nav aria-label="Account" className="ml-auto hidden items-center gap-1 md:flex">
              {desktopItems.map(({ href, label, icon: Icon, exact }) => (
                <NavLink
                  key={href}
                  href={href}
                  exact={exact}
                  className="inline-flex h-11 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] px-2.5 text-[11px] font-semibold text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-surface hover:text-primary lg:flex-row lg:gap-2 lg:px-3 lg:text-sm"
                  activeClassName="!text-primary bg-primary-soft"
                >
                  <Icon className="size-[18px]" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
              <NavLink
                href={basket.href}
                exact={basket.exact}
                className="ml-2 inline-flex h-11 items-center gap-2.5 rounded-full bg-accent pl-4 pr-3 text-sm font-semibold text-accent-ink shadow-[0_6px_16px_-8px_rgb(216_31_38/0.8)] transition-[background-color,transform] duration-[var(--dur-fast)] hover:bg-accent-strong active:scale-[0.97]"
                activeClassName="bg-accent-strong"
              >
                <basket.icon className="size-[18px]" aria-hidden="true" />
                {basket.label}
                <BasketBadge count={basketCount} className="!bg-raised !text-accent" />
              </NavLink>
              <SignOutButton iconOnly className="ml-1 grid size-11 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink" />
            </nav>
            <Link
              href="/shop#shop-q"
              aria-label="Search products"
              className="-mr-2 ml-auto grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-sunken active:bg-sunken md:hidden"
            >
              <Search className="size-5" aria-hidden="true" />
            </Link>
          </div>

          {categories.length > 0 ? (
            <div className="hidden border-t border-line md:block">
              <CategoryNav categories={categories} className="mx-auto max-w-[80rem] px-6 lg:px-8" />
            </div>
          ) : null}
        </header>

        <main id="main" className="mx-auto w-full max-w-[80rem] flex-1 px-4 pb-32 pt-5 md:px-6 md:pb-16 md:pt-8 lg:px-8">
          {children}
        </main>

        <footer className="hidden border-t border-line bg-raised md:block">
          <div className="mx-auto flex max-w-[80rem] flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-ink-muted lg:px-8">
            <p>{brand.tradingAs}</p>
            <p className="flex gap-4">
              <a className="font-semibold text-primary hover:underline" href={whatsappHref()} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
              <a className="font-semibold text-primary hover:underline" href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
            </p>
          </div>
        </footer>

        <nav
          aria-label="Account"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        >
          <ul className="relative grid grid-cols-5">
            <TabIndicator items={items.map(({ href, exact }) => ({ href, exact }))} />
            {items.map(({ href, label, icon: Icon, exact }) => (
              <li key={href}>
                <NavLink
                  href={href}
                  exact={exact}
                  className="flex min-h-16 flex-col items-center justify-start gap-0.5 pt-2 text-xs font-semibold text-ink-muted transition-colors active:bg-sunken"
                  activeClassName="!text-primary font-bold"
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
