import "server-only";
import { cache } from "react";
import {
  applyBp,
  fromIsoWeekdays,
  isProductVisible,
  resolvePrice,
  type DeliveryRules,
  type OrderLineInput,
  type Pence,
  type Weekday,
} from "@/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { loadCustomerRules, type CustomerRules } from "./pricing";

/**
 * The restaurant's own catalogue with its own prices (DECISIONS D7, D27, D32).
 *
 * Costs, margins, fixed prices and supplier ids are read here with the service-role client and
 * never leave this module: every exported shape below is built field by field and carries only
 * the resolved unit price. Callers MUST pass `viewer.customer.id` from requireRole("customer"),
 * never an id taken from the request.
 */

export interface ShopVariant {
  id: string;
  sizeLabel: string;
  sku: string | null;
  /** Ex-VAT unit price for this restaurant, or null when there is no price yet. */
  pricePence: Pence | null;
  vatRateBp: number;
  orderable: boolean;
}

export interface ShopProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imagePath: string | null;
  category: { id: string; name: string; slug: string; imagePath: string | null };
  variants: ShopVariant[];
}

export interface ShopSettings {
  delivery: DeliveryRules;
  deliveryDays: Weekday[];
  showIncVat: boolean;
}

interface RawVariant {
  id: string;
  size_label: string;
  size_sort: number;
  sku: string | null;
  cost_pence: number | null;
  vat_rate_bp: number;
  supplier_id: string | null;
  active: boolean;
}

interface RawProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  category_id: string;
  categories: { id: string; name: string; slug: string; sort: number; image_path: string | null };
  product_variants: RawVariant[];
}

const PRODUCT_COLUMNS =
  "id, name, slug, description, image_path, category_id, categories!inner(id, name, slug, sort, image_path), " +
  "product_variants(id, size_label, size_sort, sku, cost_pence, vat_rate_bp, supplier_id, active)";

interface Context {
  rules: CustomerRules;
  activeSuppliers: Set<string>;
  settings: ShopSettings;
}

/** Rules, live suppliers and shop settings for one restaurant. Once per request. */
const context = cache(async (customerId: string): Promise<Context> => {
  const admin = createAdminClient();
  const [rules, suppliers, settings] = await Promise.all([
    loadCustomerRules(admin, customerId),
    admin.from("suppliers").select("id").eq("active", true),
    admin
      .from("settings")
      .select("min_order_pence, delivery_charge_pence, delivery_vat_mode, delivery_fixed_vat_bp, delivery_days, show_prices_inc_vat")
      .single(),
  ]);
  if (suppliers.error || settings.error) throw new Error(`shop context: ${(suppliers.error ?? settings.error)!.message}`);
  const s = settings.data;
  return {
    rules,
    activeSuppliers: new Set((suppliers.data ?? []).map((r) => r.id)),
    settings: {
      delivery: {
        minOrderPence: Number(s.min_order_pence),
        deliveryChargePence: Number(s.delivery_charge_pence),
        deliveryVatMode: s.delivery_vat_mode,
        deliveryFixedVatBp: s.delivery_fixed_vat_bp,
      },
      deliveryDays: fromIsoWeekdays(s.delivery_days),
      showIncVat: s.show_prices_inc_vat,
    },
  };
});

export async function getShopSettings(customerId: string): Promise<ShopSettings> {
  return (await context(customerId)).settings;
}

function project(p: RawProduct, ctx: Context): ShopProduct | null {
  if (!isProductVisible(p.id, p.category_id, ctx.rules.visibility)) return null;
  const variants = p.product_variants
    .filter((v) => v.active)
    .sort((a, b) => a.size_sort - b.size_sort || a.size_label.localeCompare(b.size_label))
    .map((v): ShopVariant => {
      const price = resolvePrice(
        { variantId: v.id, categoryId: p.category_id, costPence: v.cost_pence === null ? null : Number(v.cost_pence) },
        ctx.rules.pricing,
      );
      return {
        id: v.id,
        sizeLabel: v.size_label,
        sku: v.sku,
        pricePence: price.pricePence,
        vatRateBp: v.vat_rate_bp,
        orderable: price.priced && v.supplier_id !== null && ctx.activeSuppliers.has(v.supplier_id),
      };
    });
  if (variants.length === 0) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    imagePath: p.image_path,
    category: { id: p.categories.id, name: p.categories.name, slug: p.categories.slug, imagePath: p.categories.image_path },
    variants,
  };
}

/** Every product this restaurant may see, in catalogue order (category, then name). */
export const listShopProducts = cache(async (customerId: string): Promise<ShopProduct[]> => {
  const ctx = await context(customerId);
  const admin = createAdminClient();
  const rows = await fetchAll<RawProduct>((from, to) =>
    admin
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("active", true)
      .eq("categories.active", true)
      .order("categories(sort)")
      .order("name")
      .order("id")
      .range(from, to) as unknown as PromiseLike<{ data: RawProduct[] | null; error: { message: string } | null }>,
  );
  return rows.flatMap((r) => project(r, ctx) ?? []);
});

/** One product by slug, or null when it does not exist or this restaurant may not see it. */
export async function getShopProduct(customerId: string, slug: string): Promise<ShopProduct | null> {
  const ctx = await context(customerId);
  const { data, error } = await createAdminClient()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .eq("active", true)
    .eq("categories.active", true)
    .maybeSingle();
  if (error) throw new Error(`shop product: ${error.message}`);
  return data ? project(data as unknown as RawProduct, ctx) : null;
}

/** Unit price as the restaurant sees it (inc VAT when the shop is set to show that). */
export function displayPence(v: Pick<ShopVariant, "pricePence" | "vatRateBp">, showIncVat: boolean): Pence | null {
  if (v.pricePence === null) return null;
  return showIncVat ? v.pricePence + applyBp(v.pricePence, v.vatRateBp) : v.pricePence;
}

// ---------------------------------------------------------------------------------------------
// Basket
// ---------------------------------------------------------------------------------------------

export type BasketProblem = "hidden" | "unpriced" | "unavailable";

export interface BasketLine {
  variantId: string;
  productName: string;
  productSlug: string | null;
  imagePath: string | null;
  categorySlug: string;
  sizeLabel: string;
  qty: number;
  pricePence: Pence | null;
  vatRateBp: number;
  problem: BasketProblem | null;
}

interface PricedBasket {
  lines: BasketLine[];
  /** Server-only: cost and supplier for each orderable line. */
  orderLines: OrderLineInput[];
}

/**
 * Prices the restaurant's basket. `basket` comes from basket_items read with the user's own
 * client (RLS: own rows only). Lines the restaurant can no longer order are kept and flagged.
 */
async function priceBasket(customerId: string, basket: { variant_id: string; qty: number }[]): Promise<PricedBasket> {
  if (basket.length === 0) return { lines: [], orderLines: [] };
  const ctx = await context(customerId);
  const { data, error } = await createAdminClient()
    .from("product_variants")
    .select(
      "id, size_label, sku, cost_pence, vat_rate_bp, supplier_id, active, " +
        "products!inner(id, name, slug, image_path, active, category_id, categories!inner(slug, active))",
    )
    .in("id", basket.map((b) => b.variant_id));
  if (error) throw new Error(`basket: ${error.message}`);
  type Row = RawVariant & {
    products: { id: string; name: string; slug: string; image_path: string | null; active: boolean; category_id: string; categories: { slug: string; active: boolean } };
  };
  const byId = new Map(((data ?? []) as unknown as Row[]).map((r) => [r.id, r]));

  const lines: BasketLine[] = [];
  const orderLines: OrderLineInput[] = [];
  for (const b of basket) {
    const v = byId.get(b.variant_id);
    if (!v) continue; // deleted size: the FK cascade removes the basket row too
    const p = v.products;
    const visible = v.active && p.active && p.categories.active && isProductVisible(p.id, p.category_id, ctx.rules.visibility);
    const price = visible
      ? resolvePrice({ variantId: v.id, categoryId: p.category_id, costPence: v.cost_pence === null ? null : Number(v.cost_pence) }, ctx.rules.pricing)
      : null;
    const supplierOk = v.supplier_id !== null && ctx.activeSuppliers.has(v.supplier_id);
    const problem: BasketProblem | null = !visible ? "hidden" : !price?.priced ? "unpriced" : !supplierOk ? "unavailable" : null;
    lines.push({
      variantId: v.id,
      productName: p.name,
      productSlug: visible ? p.slug : null,
      imagePath: visible ? p.image_path : null,
      categorySlug: p.categories.slug,
      sizeLabel: v.size_label,
      qty: b.qty,
      // A hidden product's price is not shown even if it still has one.
      pricePence: visible ? (price?.pricePence ?? null) : null,
      vatRateBp: v.vat_rate_bp,
      problem,
    });
    if (!problem && price?.priced) {
      orderLines.push({
        variantId: v.id,
        productId: p.id,
        productName: p.name,
        sizeLabel: v.size_label,
        sku: v.sku,
        qty: b.qty,
        unitPricePence: price.pricePence,
        unitCostPence: v.cost_pence === null ? null : Number(v.cost_pence),
        vatRateBp: v.vat_rate_bp,
        supplierId: v.supplier_id!,
      });
    }
  }
  return { lines, orderLines };
}

/** What the basket page may show: no cost, no supplier. */
export async function basketView(customerId: string, basket: { variant_id: string; qty: number }[]): Promise<BasketLine[]> {
  return (await priceBasket(customerId, basket)).lines;
}

/** For order placement only (server action). Includes cost and supplier: never return it to a client. */
export async function basketForOrder(customerId: string, basket: { variant_id: string; qty: number }[]): Promise<PricedBasket> {
  return priceBasket(customerId, basket);
}

/** Is this size something the restaurant can order right now? (Add-to-basket check.) */
export async function canOrderVariant(customerId: string, variantId: string): Promise<boolean> {
  const { lines } = await priceBasket(customerId, [{ variant_id: variantId, qty: 1 }]);
  return lines.length === 1 && lines[0].problem === null;
}
