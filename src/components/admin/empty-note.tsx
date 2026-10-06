import type { ReactNode } from "react";

/** An empty list: a plain line saying what is missing, one sentence on what to do, and the action. No artwork. */
export function EmptyNote({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-base font-bold text-ink">{title}</p>
      {children ? <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{children}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
