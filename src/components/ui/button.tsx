import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AppLink } from "./route-progress";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-bold transition-[background-color,box-shadow,transform] duration-[var(--dur-instant)] ease-[var(--ease-out)] active:translate-y-[2px] active:shadow-none " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:bg-primary-strong shadow-[var(--edge-primary)]",
  accent: "bg-accent text-accent-ink hover:brightness-95 shadow-[var(--edge-accent)]",
  secondary: "bg-raised text-ink border-[1.5px] border-line-strong hover:bg-sunken active:translate-y-0",
  ghost: "text-ink hover:bg-sunken active:translate-y-0",
  danger: "bg-danger text-primary-ink hover:bg-danger-strong shadow-[0_2px_0_var(--danger-strong)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-[var(--radius-sm)]",
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
