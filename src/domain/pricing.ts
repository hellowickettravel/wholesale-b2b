/**
 * Per-customer price resolution. The ONLY place sell prices are derived from cost.
 * Precedence (DECISIONS.md D4):
 *   1. fixed price override for customer + variant
 *   2. customer's margin for the product's category
 *   3. customer's default margin
 *   4. global default margin
 * A variant with no cost and no override has no price.
 */
import { BP_SCALE, roundDiv, type BasisPoints, type Pence } from "./money";

export type PriceSource = "override" | "category" | "customer" | "global";

export interface PricingRules {
  globalMarginBp: BasisPoints;
  customerDefaultMarginBp: BasisPoints | null;
  /** categoryId -> margin bp */
  categoryMarginsBp: Readonly<Record<string, BasisPoints>>;
  /** variantId -> fixed unit price in pence (ex VAT) */
  overridesPence: Readonly<Record<string, Pence>>;
}

export interface PricedVariantInput {
  variantId: string;
  categoryId: string;
  costPence: Pence | null;
}

export type ResolvedPrice =
  | { priced: true; pricePence: Pence; source: PriceSource; marginBp: BasisPoints | null }
  | { priced: false; pricePence: null; source: "unpriced"; marginBp: null };

/** Sell price from cost and margin. Floors at zero (a margin below -100% cannot go negative). */
export function sellFromCost(costPence: Pence, marginBp: BasisPoints): Pence {
  const price = roundDiv(costPence * (BP_SCALE + marginBp), BP_SCALE);
  return Math.max(0, price);
}

/** Effective margin in bp for display, or null if cost is 0/unknown. */
export function marginFromPrice(costPence: Pence | null, pricePence: Pence): BasisPoints | null {
  if (costPence === null || costPence === 0) return null;
  return roundDiv((pricePence - costPence) * BP_SCALE, costPence);
}

export function resolveMarginBp(
  categoryId: string,
  rules: PricingRules,
): { marginBp: BasisPoints; source: Exclude<PriceSource, "override"> } {
  const cat = rules.categoryMarginsBp[categoryId];
  if (cat !== undefined) return { marginBp: cat, source: "category" };
  if (rules.customerDefaultMarginBp !== null) {
    return { marginBp: rules.customerDefaultMarginBp, source: "customer" };
  }
  return { marginBp: rules.globalMarginBp, source: "global" };
}

export function resolvePrice(variant: PricedVariantInput, rules: PricingRules): ResolvedPrice {
  const override = rules.overridesPence[variant.variantId];
  if (override !== undefined) {
    return {
      priced: true,
      pricePence: override,
      source: "override",
      marginBp: marginFromPrice(variant.costPence, override),
    };
  }
  if (variant.costPence === null) {
    return { priced: false, pricePence: null, source: "unpriced", marginBp: null };
  }
  const { marginBp, source } = resolveMarginBp(variant.categoryId, rules);
  return { priced: true, pricePence: sellFromCost(variant.costPence, marginBp), source, marginBp };
}

/** Profit per unit (ex VAT); null if cost unknown. */
export function unitProfit(costPence: Pence | null, pricePence: Pence): Pence | null {
  return costPence === null ? null : pricePence - costPence;
}
