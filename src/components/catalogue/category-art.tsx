import Image from "next/image";
import { Bean, CookingPot, Coffee, CupSoda, Flame, Leaf, Package, Palette, ShoppingBasket, SprayCan, Wheat, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Warm spice-market palette (turmeric, chilli, cardamom, saffron, tea, pine) per launch category. */
const ART: Record<string, { icon: LucideIcon; hue: number }> = {
  rice: { icon: Wheat, hue: 42 },
  "pulses-nuts-and-groceries": { icon: Bean, hue: 28 },
  "whole-spices": { icon: Leaf, hue: 95 },
  "powders-and-ground-masala": { icon: Flame, hue: 12 },
  "flours-atta-and-rava": { icon: Wheat, hue: 36 },
  "tea-powders-and-milk-mix": { icon: Coffee, hue: 22 },
  sauces: { icon: CookingPot, hue: 6 },
  "food-colours": { icon: Palette, hue: 340 },
  "restaurant-groceries": { icon: ShoppingBasket, hue: 152 },
  drinks: { icon: CupSoda, hue: 190 },
  "restaurant-packing-and-cleaning": { icon: SprayCan, hue: 205 },
};

function artFor(slug: string) {
  if (ART[slug]) return ART[slug];
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { icon: Package, hue: [42, 12, 95, 152, 28][h % 5] };
}

/**
 * Category visual: the category photo when one is uploaded, otherwise a warm illustrated tile.
 * Purely decorative (the category name is always shown next to it).
 */
export function CategoryArt({
  slug,
  imageUrl,
  className,
  iconClassName,
  sizes = "(min-width: 1024px) 280px, 50vw",
}: {
  slug: string;
  imageUrl?: string | null;
  className?: string;
  iconClassName?: string;
  sizes?: string;
}) {
  if (imageUrl) {
    return (
      <div aria-hidden="true" className={cn("relative overflow-hidden bg-sunken", className)}>
        <Image src={imageUrl} alt="" fill sizes={sizes} className="object-cover" />
      </div>
    );
  }
  const { icon: Icon, hue } = artFor(slug);
  return (
    <div
      aria-hidden="true"
      className={cn("relative grid place-items-center overflow-hidden", className)}
      style={{ background: `radial-gradient(120% 90% at 85% 10%, hsl(${hue} 70% 88%), hsl(${hue} 45% 80%) 55%, hsl(${hue} 40% 70%))` }}
    >
      <svg className="absolute inset-0 size-full opacity-[0.16]" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice">
        {[...Array(18)].map((_, i) => (
          <circle key={i} cx={(i * 37) % 120} cy={(i * 23) % 80} r={2 + ((i * 7) % 5)} fill={`hsl(${hue} 55% 30%)`} />
        ))}
      </svg>
      <Icon className={cn("relative size-10", iconClassName)} style={{ color: `hsl(${hue} 50% 24%)` }} strokeWidth={1.6} />
    </div>
  );
}
