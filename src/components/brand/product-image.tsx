import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Product photo with a clean, deterministic placeholder when no photo exists yet
 * (many imported items have no photo; we never borrow images without permission).
 */
export function ProductImage({
  src,
  alt,
  name,
  className,
  sizes = "(min-width: 1024px) 240px, 45vw",
  priority,
  fallback,
}: {
  src?: string | null;
  alt: string;
  name: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Rendered instead of the initials placeholder when there is no photo. */
  fallback?: ReactNode;
}) {
  if (src) {
    return (
      <div className={cn("relative aspect-square overflow-hidden bg-raised", className)}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-contain p-3" priority={priority} />
      </div>
    );
  }
  if (fallback) return <>{fallback}</>;
  const hues = [152, 38, 24, 200, 280, 95];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = hues[h % hues.length];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      role="img"
      aria-label={`${name} (photo coming soon)`}
      className={cn("relative grid aspect-square place-items-center overflow-hidden", className)}
      style={{ background: `linear-gradient(140deg, hsl(${hue} 35% 94%), hsl(${hue} 30% 88%))` }}
    >
      <svg aria-hidden="true" className="absolute inset-0 size-full opacity-[0.07]" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id={`p${hue}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
            <line x1="0" y1="0" x2="0" y2="10" stroke={`hsl(${hue} 40% 25%)`} strokeWidth="3" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#p${hue})`} />
      </svg>
      <span className="font-display text-3xl font-bold" style={{ color: `hsl(${hue} 30% 32%)` }} aria-hidden="true">
        {initials}
      </span>
    </div>
  );
}
