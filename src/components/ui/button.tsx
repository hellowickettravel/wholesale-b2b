import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:bg-primary-strong shadow-[0_1px_0_rgba(0,0,0,0.08)]",
  accent: "bg-accent text-accent-ink hover:brightness-95",
  secondary: "bg-raised text-ink border border-line-strong hover:bg-sunken",
  ghost: "text-ink hover:bg-sunken",
  danger: "bg-danger text-white hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-[var(--radius-sm)]",
  md: "h-10 px-4 text-sm rounded-[var(--radius-md)]",
  lg: "h-12 px-5 text-base rounded-[var(--radius-md)]",
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

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; block?: boolean; icon?: ReactNode };

export function LinkButton({ variant, size, block, icon, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClasses({ variant, size, block, className })} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
