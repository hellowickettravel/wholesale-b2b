import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/** Full-page status screen used by 404, 403, error and pending states. */
export function StatusPage({ code, title, children, actions }: { code?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <div className="px-4 py-5 sm:px-6">
        <Logo />
      </div>
      <main id="main" className="grid flex-1 place-items-center px-4 pb-24">
        <div className="max-w-md text-center">
          {code ? (
            <p className="font-display text-[88px] font-extrabold leading-none text-primary/15" aria-hidden="true">{code}</p>
          ) : null}
          <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
          {children ? <div className="mt-3 text-[15px] leading-relaxed text-ink-muted">{children}</div> : null}
          {actions ? <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div> : null}
        </div>
      </main>
    </div>
  );
}
