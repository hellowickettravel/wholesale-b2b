import type { CSSProperties, ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import "./admin-shell.css";

/**
 * Supplier: the same family as the back office (clove bar, flour page, Mukta throughout) with only
 * what a supplier needs. No prices anywhere on these screens.
 */
export function SupplierShell({ children, supplierName }: { children: ReactNode; supplierName: string }) {
  return (
      <div data-surface="admin" style={{ "--font-display": "var(--font-body)" } as CSSProperties} className="flex min-h-dvh flex-col bg-surface">
        <header className="on-dark sticky top-0 z-30 bg-dark">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
            <div className="flex items-center gap-3">
              <Logo href="/supplier" inverted />
              <span className="hidden rounded-[var(--radius-sm)] bg-white/12 px-2 py-0.5 text-xs font-bold text-on-dark-muted sm:inline">Supplier</span>
            </div>
            <div className="flex min-w-0 items-center gap-4">
              <span className="truncate text-sm font-semibold text-on-dark">{supplierName}</span>
              <SignOutButton className="shrink-0 text-on-dark-muted hover:text-on-dark" />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
  );
}
