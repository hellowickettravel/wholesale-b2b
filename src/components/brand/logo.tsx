import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

/** Brand mark: image logo if configured, otherwise a two-tone text wordmark. */
export function Logo({ href = "/", className, inverted }: { href?: string; className?: string; inverted?: boolean }) {
  const content = brand.logo ? (
    <Image src={brand.logo.src} alt={brand.logo.alt} width={brand.logo.width} height={brand.logo.height} className="h-8 w-auto" priority />
  ) : (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "grid size-8 place-items-center rounded-[9px] font-display text-[15px] font-extrabold",
          inverted ? "bg-accent text-accent-ink" : "bg-primary text-primary-ink",
        )}
      >
        {brand.wordmark.lead.charAt(0)}
      </span>
      <span className={cn("font-display text-[19px] font-bold tracking-tight", inverted ? "text-white" : "text-ink")}>
        {brand.wordmark.lead}
        <span className={inverted ? "text-accent" : "text-primary"}>{brand.wordmark.tail}</span>
      </span>
    </span>
  );
  return (
    <Link href={href} className={cn("inline-flex shrink-0 items-center", className)} aria-label={`${brand.name} home`}>
      {content}
    </Link>
  );
}
