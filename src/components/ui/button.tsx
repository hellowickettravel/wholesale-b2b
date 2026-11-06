import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AppLink } from "./route-progress";
import { Spinner } from "./spinner";

/**
 * primary = navy, the one main action on a screen. accent = red, buying only (Add, Place order, Open a trade account).
 * secondary = outline, everything else. ghost = toolbar/text-like. danger = a confirmed destructive action;
 * danger-ghost = the quiet way to offer a rare destructive action (Delete, Cancel order) before confirming.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost" | "accent";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.98] " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:bg-primary-strong",
  accent: "bg-accent text-accent-ink hover:bg-accent-strong",
  secondary: "bg-raised text-ink border border-line-control hover:border-primary hover:text-primary",
  ghost: "text-ink hover:bg-sunken",
  danger: "bg-danger text-primary-ink hover:bg-danger-strong",
  "danger-ghost": "text-danger hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-[var(--radius-md)]",
  md: "h-11 px-4 text-sm rounded-[var(--radius-md)]",
  lg: "h-12 px-6 text-base rounded-[var(--radius-md)]",
};

export function buttonClasses(opts: { variant?: Variant; size?: Size; block?: boolean; className?: string } = {}) {
  const { variant = "primary", size = "md", block, className } = opts;
  return cn(base, variants[variant], sizes[size], block && "w-full", className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant, size, block, loading, icon, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof AppLink> & { variant?: Variant; size?: Size; block?: boolean; icon?: ReactNode };

export function LinkButton({ variant, size, block, icon, className, children, ...rest }: LinkButtonProps) {
  return (
    <AppLink className={buttonClasses({ variant, size, block, className })} {...rest}>
      {icon}
      {children}
    </AppLink>
  );
}
