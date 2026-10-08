import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { LogoMark } from "./logo-mark";

/** Brand mark: image logo if configured, otherwise the SVG awning mark and the two-tone wordmark. */
export function Logo({ href = "/", className, inverted, compact }: { href?: string; className?: string; inverted?: boolean; compact?: boolean }) {
  const content = brand.logo ? (
    <Image src={brand.logo.src} alt={brand.logo.alt} width={brand.logo.width} height={brand.logo.height} className="h-8 w-auto" priority />
  ) : (
    <span className={cn("inline-flex items-center gap-2.5", compact && "max-[420px]:gap-2")}>
      <LogoMark className={cn("size-9", compact && "max-[420px]:size-8", inverted && "rounded-[8px] ring-1 ring-white/25")} />
      <span className={cn("flex flex-col leading-none", compact && "max-[359px]:hidden")}>
        <span className={cn("font-display text-[19px] font-extrabold tracking-[-0.03em]", compact && "max-[420px]:text-[16px]", inverted ? "text-on-dark" : "text-primary")}>
          {brand.wordmark.lead}{" "}
          <span className={inverted ? "text-sun" : "text-mark"}>{brand.wordmark.tail}</span>
        </span>
        <span className={cn("mt-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]", compact && "max-[420px]:hidden", inverted ? "text-on-dark-muted" : "text-ink-subtle")}>Trade wholesale</span>
      </span>
    </span>
  );
  return (
    <Link href={href} className={cn("inline-flex shrink-0 items-center rounded-[var(--radius-md)]", className)} aria-label={`${brand.name} home`}>
      {content}
    </Link>
  );
}
