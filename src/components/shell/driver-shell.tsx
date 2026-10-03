import type { ReactNode } from "react";
import { brand } from "@/config/brand";

/** Driver page: no navigation, big touch targets, works one-handed. */
export function DriverShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="bg-primary text-primary-ink">
        <div className="mx-auto flex h-12 max-w-md items-center justify-between px-4">
          <span className="font-display text-base font-bold">{brand.name}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-white/70">Proof of delivery</span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-5">{children}</main>
    </div>
  );
}
