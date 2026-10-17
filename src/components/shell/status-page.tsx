import type { ReactNode } from "react";
import Link from "next/link";
import { PlateMessage } from "@/components/brand/plate-message";
import { Logo } from "@/components/brand/logo";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { whatsappHref } from "@/config/brand";

/**
 * Full-page status screen used by 404, 403, error and pending states: the header (logo, catalogue, contact),
 * then one flat card that says what happened and what to do next.
 */
export function StatusPage({
  code,
  title,
  children,
  actions,
}: {
  /** Shown above the heading, e.g. "404". */
  code?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  /** Accepted for compatibility; every status page now has the same plain background. */
  ground?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-line bg-raised">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <Logo />
          <nav aria-label="Help" className="flex items-center gap-1 text-sm font-medium">
            <Link href="/catalogue" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-ink-muted hover:text-ink max-sm:hidden">Catalogue</Link>
            <a href={whatsappHref()} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] px-3 text-ink-muted hover:text-ink">
              <WhatsAppIcon className="size-4" /> Contact us
            </a>
          </nav>
        </div>
      </header>
      <main id="main" className="grid flex-1 place-items-center px-4 py-12 sm:py-16">
        <PlateMessage headingLevel={1} title={title} tab={code ? `Error ${code}` : undefined} actions={actions}>
          {children}
        </PlateMessage>
      </main>
    </div>
  );
}
