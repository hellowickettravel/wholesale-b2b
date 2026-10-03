import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

export function SupplierShell({ children, supplierName }: { children: ReactNode; supplierName: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-raised">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/supplier" />
            <span className="hidden rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-muted sm:inline">Supplier</span>
          </div>
          <span className="truncate text-sm font-medium text-ink-muted">{supplierName}</span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
