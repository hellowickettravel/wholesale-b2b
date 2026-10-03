import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-[var(--radius-md)] border border-line-strong bg-raised px-3 text-[15px] text-ink " +
  "placeholder:text-ink-subtle transition-colors hover:border-ink-subtle " +
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 " +
  "disabled:bg-sunken disabled:text-ink-muted aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11 sm:h-10", className)} {...rest} />;
}

export function Textarea({ className, rows = 3, ...rest }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(control, "py-2 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(control, "h-11 appearance-none pr-9 sm:h-10", className)} {...rest}>
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
      >
        <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Checkbox({ className, label, ...rest }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-start gap-2.5 text-sm text-ink", className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-[var(--brand-primary)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/**
 * Label + control + hint + error, wired for accessibility. The render prop receives the
 * ids so the control gets aria-describedby and aria-invalid.
 */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | string[] | null;
  required?: boolean;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean; required?: boolean }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorText = Array.isArray(error) ? error[0] : error;
  const errorId = errorText ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-0.5 text-danger" aria-hidden="true">*</span> : null}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": errorText ? true : undefined, required })}
      {hint && !errorText ? (
        <p id={hintId} className="text-[13px] text-ink-muted">{hint}</p>
      ) : null}
      {errorText ? (
        <p id={errorId} className="text-[13px] font-medium text-danger">{errorText}</p>
      ) : null}
    </div>
  );
}
