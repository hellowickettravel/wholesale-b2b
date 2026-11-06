import { useId, type ComponentProps, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

// 1px --line-control border (3:1 on white), 10px radius, white fill. Focus: the global 3px ring plus a primary border.
// Errors are never colour alone: red border and tint here, an icon and text under the field (see Field).
// `dense` is the compact size for tables and editors (36px; text stays 16px on phones so iOS does not zoom).
export const control =
  "block w-full rounded-[var(--radius-md)] border border-line-control bg-raised px-3.5 text-base text-ink " +
  "placeholder:text-ink-subtle transition-[border-color,background-color,box-shadow] duration-[var(--dur-fast)] hover:border-ink-muted " +
  "focus:border-primary focus:shadow-[0_0_0_3px_rgb(37_99_235/0.15)] " +
  "disabled:bg-sunken disabled:text-ink-muted disabled:hover:border-line-control " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-soft/40 aria-[invalid=true]:hover:border-danger";

const dense = "h-9 px-3 sm:text-sm";

export function Input({ className, dense: isDense, ...rest }: ComponentProps<"input"> & { dense?: boolean }) {
  return <input className={cn(control, "h-11", isDense && dense, className)} {...rest} />;
}

export function Textarea({ className, rows = 3, ...rest }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(control, "py-3 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, dense: isDense, ...rest }: ComponentProps<"select"> & { dense?: boolean }) {
  return (
    <div className="relative">
      <select className={cn(control, "h-11 cursor-pointer appearance-none pr-10", isDense && cn(dense, "pr-9"), className)} {...rest}>
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className={cn("pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-ink-muted", isDense ? "right-3" : "right-3.5")}
      >
        <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Native checkbox, 20px, with the whole label as the target (44px tall row). */
export function Checkbox({ className, label, ...rest }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex min-h-11 cursor-pointer items-center gap-3 text-base text-ink", className)}>
      <input type="checkbox" className="size-5 shrink-0 cursor-pointer rounded-[5px] border-line-control accent-[var(--brand-primary)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/**
 * Label + control + hint + error, wired for accessibility. The render prop receives the
 * ids so the control gets aria-describedby and aria-invalid. Label sits above the control; an error
 * is an icon, the message and a chilli border on the control (never colour alone).
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
  const errorText = Array.isArray(error) ? error[0] : error;
  const hintId = hint && !errorText ? `${id}-hint` : undefined;
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
        <p id={hintId} className="text-sm text-ink-muted">{hint}</p>
      ) : null}
      {errorText ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-semibold text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{errorText}</span>
        </p>
      ) : null}
    </div>
  );
}
