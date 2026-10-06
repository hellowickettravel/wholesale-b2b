import type { ReactNode } from "react";
import { PlateMessage } from "@/components/brand/plate-message";
import { Logo } from "@/components/brand/logo";

/**
 * Full-page status screen used by 404, 403, error and pending states: the header, then one plate
 * on a shelf-colour ground that says what happened and what to do next.
 */
export function StatusPage({
  code,
  title,
  children,
  actions,
  ground = "default",
}: {
  /** Shown on the plate's lower rim, e.g. "404". */
  code?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  /** Shelf colour behind the plate (a category slug). */
  ground?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-line bg-raised">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center px-4 sm:h-16 sm:px-6">
          <Logo />
        </div>
      </header>
      <main id="main" data-ground={ground} className="weave grid flex-1 place-items-center px-4 py-12 sm:py-16">
        <PlateMessage headingLevel={1} title={title} tab={code} actions={actions}>
          {children}
        </PlateMessage>
      </main>
    </div>
  );
}
