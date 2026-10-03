"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Accessible modal on the native <dialog> element (focus trap and Esc handled by the browser). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
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
      className="m-auto w-[min(92vw,520px)] rounded-[var(--radius-xl)] border border-line bg-raised p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-5">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="-mr-2 rounded-full p-2 text-ink-muted hover:bg-sunken" aria-label="Close">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {children ? <div className="px-6 py-4">{children}</div> : null}
      {footer ? <div className="flex justify-end gap-2 border-t border-line bg-surface px-6 py-3">{footer}</div> : null}
    </dialog>
  );
}
