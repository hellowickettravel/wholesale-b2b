"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Accessible modal on the native <dialog> element (focus trap and Esc handled by the browser).
 * It fades and scales in (CSS @starting-style, see `.ui-dialog`); on phones it is a bottom sheet that
 * slides up, unless `sheet={false}`. Under reduced motion it simply appears.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  sheet = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Bottom sheet below 640px (default). Pass false to keep a centred dialog on phones too. */
  sheet?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      data-sheet={sheet ? "" : undefined}
      className="ui-dialog rounded-[var(--radius-xl)] max-sm:data-[sheet]:rounded-b-none border border-line bg-raised p-0 text-ink shadow-pop backdrop:backdrop-blur-none"
    >
      {sheet ? <span aria-hidden="true" className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-line-strong/50 sm:hidden" /> : null}
      <div className="flex items-start justify-between gap-4 px-5 pt-4 sm:px-6 sm:pt-5">
        <div className="min-w-0">
          <h2 className="text-xl leading-tight">{title}</h2>
          {description ? <p className="mt-1.5 text-sm text-ink-muted">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 -mt-1 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-sunken hover:text-ink"
          aria-label="Close"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      {children ? <div className="px-5 py-4 sm:px-6">{children}</div> : null}
      {footer ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
