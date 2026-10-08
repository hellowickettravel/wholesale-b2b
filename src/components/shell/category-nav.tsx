"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LayoutGrid } from "lucide-react";
import { AppLink } from "@/components/ui/route-progress";
import { cn } from "@/lib/cn";

export interface NavCategory {
  slug: string;
  name: string;
}

function Items({ categories, base, active }: { categories: NavCategory[]; base: string; active: string | null }) {
  const item =
    "relative inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-sm font-semibold text-ink-muted transition-colors duration-[var(--dur-fast)] hover:text-primary " +
    "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:origin-center after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-[var(--dur-base)] after:ease-[var(--ease-out)]";
  const on = "!text-primary after:scale-x-100";
  return (
    <ul className="flex items-center">
      <li>
        <AppLink href={base} aria-current={active === "" ? "page" : undefined} className={cn(item, "pl-0 after:left-0", active === "" && on)}>
          <LayoutGrid className="size-4" aria-hidden="true" />
          All products
        </AppLink>
      </li>
      {categories.map((c) => (
        <li key={c.slug}>
          <AppLink href={`${base}?category=${c.slug}`} aria-current={active === c.slug ? "page" : undefined} className={cn(item, active === c.slug && on)}>
            {c.name}
          </AppLink>
        </li>
      ))}
    </ul>
  );
}

function Live({ categories, base }: { categories: NavCategory[]; base: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = pathname === base ? (params.get("category") ?? "") : null;
  return <Items categories={categories} base={base} active={active} />;
}

/**
 * The category bar under the shop header (wide screens). The current category gets a red underline that grows
 * from the centre. The list scrolls sideways when it does not fit.
 */
export function CategoryNav({ categories, base = "/shop", className }: { categories: NavCategory[]; base?: string; className?: string }) {
  return (
    <nav aria-label="Categories" className={cn("overflow-x-auto [scrollbar-width:none] [mask-image:linear-gradient(to_right,#000_94%,transparent)]", className)}>
      <Suspense fallback={<Items categories={categories} base={base} active={null} />}>
        <Live categories={categories} base={base} />
      </Suspense>
    </nav>
  );
}
