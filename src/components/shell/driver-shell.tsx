import type { ReactNode } from "react";
import { brand } from "@/config/brand";

/** Driver page: no navigation, big touch targets, works one-handed. Light: no photography, no motion. */
export function DriverShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="bg-primary text-primary-ink">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <span className="font-display text-xl">{brand.name}</span>
          <span className="text-sm font-semibold text-sunken">Proof of delivery</span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 pb-12 pt-5">{children}</main>
    </div>
  );
}
