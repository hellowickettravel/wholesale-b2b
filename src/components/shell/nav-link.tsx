"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AppLink } from "@/components/ui/route-progress";

export function isActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Nav item with active state and pending feedback (route bar + dim while the next page loads). */
export function NavLink({
  href,
  exact,
  className,
  activeClassName,
  children,
}: {
  href: string;
  exact?: boolean;
  className?: string;
  activeClassName?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href, exact);
  return (
    <AppLink href={href} aria-current={active ? "page" : undefined} className={cn(className, active && activeClassName)}>
      {children}
    </AppLink>
  );
}
