import type { ReactNode } from "react";
import {
  BadgePercent,
  Boxes,
  ClipboardList,
  FileText,
  FolderTree,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Truck,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ToastProvider } from "@/components/ui/toast";
import { NavLink } from "./nav-link";

const groups = [
  {
    label: "Daily",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/orders", label: "Orders", icon: ClipboardList },
      { href: "/admin/payments", label: "Payments & chasing", icon: Wallet },
      { href: "/admin/approvals", label: "Approvals", icon: UserCheck },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/pricing", label: "Pricing", icon: BadgePercent },
      { href: "/admin/invoices", label: "Invoices", icon: FileText },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Boxes },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/suppliers", label: "Suppliers", icon: Truck },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/users", label: "Users", icon: ShieldCheck },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const linkCls =
  "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white";
const activeCls = "bg-white/10 !text-white shadow-[inset_3px_0_0_var(--brand-accent)]";

/** Admin: dark sidebar on desktop (lg+); on tablet/phone a horizontal scrolling nav strip. */
export function AdminShell({ children, userName, badges = {} }: { children: ReactNode; userName: string; badges?: Record<string, number> }) {
  const flat = groups.flatMap((g) => g.items);
  return (
    <ToastProvider>
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden bg-ink lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="px-5 py-5">
          <Logo href="/admin" inverted />
        </div>
        <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/35">{g.label}</div>
              <ul className="space-y-0.5">
                {g.items.map(({ href, label, icon: Icon, exact }) => (
                  <li key={href}>
                    <NavLink href={href} exact={exact} className={linkCls} activeClassName={activeCls}>
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="flex-1">{label}</span>
                      {badges[href] ? (
                        <span className="tabular rounded-full bg-accent px-1.5 text-xs font-bold text-accent-ink">{badges[href]}</span>
                      ) : null}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-white/10 px-5 py-4 text-sm text-white/60">
          <p className="truncate">
            Signed in as <span className="font-medium text-white">{userName}</span>
          </p>
          <SignOutButton className="text-white/60 hover:text-white" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-ink lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo href="/admin" inverted />
            <div className="flex min-w-0 items-center gap-4">
              <span className="hidden truncate text-sm text-white/60 sm:inline">{userName}</span>
              <SignOutButton className="text-white/70 hover:text-white" />
            </div>
          </div>
          <nav aria-label="Admin" className="overflow-x-auto">
            <ul className="flex min-w-max gap-1 px-3 pb-2">
              {flat.map(({ href, label, exact }) => (
                <li key={href}>
                  <NavLink
                    href={href}
                    exact={exact}
                    className="inline-flex rounded-full px-3 py-1.5 text-[13px] font-medium text-white/70 hover:text-white"
                    activeClassName="bg-white/15 !text-white"
                  >
                    {label}
                    {badges[href] ? <span className="ml-1.5 rounded-full bg-accent px-1.5 text-xs font-bold text-accent-ink">{badges[href]}</span> : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
