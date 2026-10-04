/**
 * Which products a restaurant may see (DECISIONS D27). Pure; unit-tested.
 *
 *   visible = (category granted AND product not denied) OR product explicitly allowed
 *
 * A customer with no categories granted sees only explicitly allowed products. Inactive
 * products, categories and sizes are filtered before this runs.
 */
export type ProductRuleMode = "allow" | "deny";

export interface VisibilityRules {
  categoryIds: ReadonlySet<string>;
  /** productId -> allow | deny */
  productRules: Readonly<Record<string, ProductRuleMode>>;
}

export function isProductVisible(productId: string, categoryId: string, rules: VisibilityRules): boolean {
  const rule = rules.productRules[productId];
  if (rule === "allow") return true;
  if (rule === "deny") return false;
  return rules.categoryIds.has(categoryId);
}

/** Why a product is (not) visible, for the admin pricing screen. */
export function visibilityReason(
  productId: string,
  categoryId: string,
  rules: VisibilityRules,
): "allowed" | "denied" | "category" | "hidden-category" {
  const rule = rules.productRules[productId];
  if (rule === "allow") return "allowed";
  if (rule === "deny") return "denied";
  return rules.categoryIds.has(categoryId) ? "category" : "hidden-category";
}
