import type { ReactNode } from "react";
import {
  BadgePercent,
  Boxes,
  ClipboardList,
  FileText,
  FolderTree,
  LayoutDashboard,
  KeyRound,
  Mail,
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
import { AdminMobileMenu } from "./admin-mobile-menu";
import { NavLink } from "./nav-link";
import "./admin-shell.css";

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
      { href: "/admin/emails", label: "Emails", icon: Mail },
      { href: "/admin/security", label: "Security", icon: KeyRound },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const linkCls =
  "flex min-h-9 items-center gap-3 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-semibold text-on-dark-muted transition-colors duration-[var(--dur-fast)] hover:bg-white/8 hover:text-on-dark";
const activeCls = "bg-white/12 !text-on-dark shadow-[inset_3px_0_0_var(--brand-accent)]";

/**
 * Admin: navy sidebar on desktop (lg+), sticky for the full viewport height; on tablet and phone a
 * "Menu" button that opens the same grouped list (every section one tap away). Working screens: dense and plain.
 */
export function AdminShell({ children, userName, badges = {} }: { children: ReactNode; userName: string; badges?: Record<string, number> }) {
  const flat = groups.flatMap((g) => g.items);
  return (
    <ToastProvider>
      <div
        data-surface="admin"
        className="min-h-dvh bg-surface lg:grid lg:grid-cols-[248px_minmax(0,1fr)]"
      >
        <div className="on-dark hidden bg-primary-strong lg:block">
          <aside className="sticky top-0 flex h-dvh flex-col">
            <div className="px-5 pb-3 pt-4">
              <Logo href="/admin" inverted />
            </div>
            <nav aria-label="Admin" className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
              {groups.map((g) => (
                <div key={g.label}>
                  <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/50">{g.label}</div>
                  <ul className="space-y-0.5">
                    {g.items.map(({ href, label, icon: Icon, exact }) => (
                      <li key={href}>
                        <NavLink href={href} exact={exact} className={linkCls} activeClassName={activeCls}>
                          <Icon className="size-4 shrink-0" aria-hidden="true" />
                          <span className="flex-1">{label}</span>
                          {badges[href] ? (
                            <span className="tabular min-w-5 rounded-[var(--radius-sm)] bg-accent px-1.5 text-center text-xs font-bold text-accent-ink">{badges[href]}</span>
                          ) : null}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            <div className="space-y-1.5 border-t border-white/12 px-5 py-3 text-sm text-on-dark-muted">
              <p className="truncate">
                Signed in as <span className="font-semibold text-on-dark">{userName}</span>
              </p>
              <SignOutButton className="text-on-dark-muted hover:text-on-dark" />
            </div>
          </aside>
        </div>

        <div className="flex min-w-0 flex-col">
          <header className="on-dark sticky top-0 z-30 bg-primary-strong lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <Logo href="/admin" inverted />
              <div className="flex min-w-0 items-center gap-4">
                <span className="hidden truncate text-sm text-on-dark-muted sm:inline">{userName}</span>
                <SignOutButton className="text-on-dark-muted hover:text-on-dark" />
              </div>
            </div>
            <AdminMobileMenu items={flat.map(({ href, label, exact }) => ({ href, label, exact }))} attention={Object.values(badges).reduce((a, b) => a + (b || 0), 0)}>
              <nav aria-label="Admin" className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
                {groups.map((g) => (
                  <div key={g.label}>
                    <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/50">{g.label}</div>
                    <ul className="space-y-0.5">
                      {g.items.map(({ href, label, icon: Icon, exact }) => (
                        <li key={href}>
                          <NavLink href={href} exact={exact} className={`${linkCls} min-h-11`} activeClassName={activeCls}>
                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                            <span className="flex-1">{label}</span>
                            {badges[href] ? (
                              <span className="tabular min-w-5 rounded-[var(--radius-sm)] bg-accent px-1.5 text-center text-xs font-bold text-accent-ink">{badges[href]}</span>
                            ) : null}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </AdminMobileMenu>
          </header>
          <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
