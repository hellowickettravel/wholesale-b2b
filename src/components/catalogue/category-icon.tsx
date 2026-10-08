import { createElement } from "react";
import { Bean, Coffee, CupSoda, Droplets, Flame, Leaf, Package, Palette, ShoppingBag, Store, Wheat, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** One line icon per launch category (by slug). Anything else gets the shop-front. */
const ICONS: Record<string, LucideIcon> = {
  rice: Wheat,
  "pulses-nuts-and-groceries": Bean,
  "whole-spices": Leaf,
  "powders-and-ground-masala": Flame,
  "flours-atta-and-rava": Wheat,
  "tea-powders-and-milk-mix": Coffee,
  sauces: Droplets,
  "food-colours": Palette,
  "restaurant-groceries": ShoppingBag,
  drinks: CupSoda,
  "restaurant-packing-and-cleaning": Package,
};

export function categoryIcon(slug: string | undefined): LucideIcon {
  return (slug && ICONS[slug]) || Store;
}

/** The category's icon in its own colour (set data-ground on an ancestor or pass slug). */
export function CategoryIcon({ slug, className, strokeWidth = 1.75 }: { slug?: string; className?: string; strokeWidth?: number }) {
  return createElement(categoryIcon(slug), { "aria-hidden": true, strokeWidth, className: cn("text-[var(--g,var(--ground-default))]", className) });
}
