"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { pricingSaveSchema, type PricingSave } from "@/lib/validation/customer";
import { requireRole } from "@/server/auth";

const uuid = z.uuid();
export interface PricingResult {
  error?: string;
  notice?: string;
}

function chunks<T>(xs: T[], n = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

/**
 * Save the pricing screen. Written with the ADMIN'S OWN client (RLS: admin only; every change
 * lands in the audit log under the admin). Only changed products and sizes are sent.
 */
export async function savePricing(customerId: string, input: PricingSave): Promise<PricingResult> {
  await requireRole("admin");
  if (!uuid.safeParse(customerId).success) return { error: "Not found." };
  const parsed = pricingSaveSchema.safeParse(input);
  if (!parsed.success) return { error: "Some values are not valid. Check margins and fixed prices." };
  const p = parsed.data;
  if (Object.keys(p.productRules).length > 5000 || Object.keys(p.overrides).length > 10000) return { error: "Too many changes at once." };

  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("id").eq("id", customerId).maybeSingle();
  if (!customer) return { error: "Not found." };

  const run = async (label: string, q: PromiseLike<{ error: { code?: string; message: string } | null }>) => {
    const { error } = await q;
    if (error) {
      console.error(`save pricing (${label}) failed`, error.code, error.message);
      throw new Error(error.code === "23503" ? "Something you changed no longer exists. Reload the page." : "The changes could not be saved. Please try again.");
    }
  };

  try {
    await run("default margin", supabase.from("customer_private").upsert({ customer_id: customerId, default_margin_bp: p.defaultMarginBp }));

    const grant = p.categories.filter((c) => c.access).map((c) => ({ customer_id: customerId, category_id: c.id }));
    const revoke = p.categories.filter((c) => !c.access).map((c) => c.id);
    if (grant.length) await run("access", supabase.from("customer_category_access").upsert(grant, { ignoreDuplicates: true }));
    if (revoke.length) await run("access", supabase.from("customer_category_access").delete().eq("customer_id", customerId).in("category_id", revoke));

    const margins = p.categories.filter((c) => c.marginBp !== null).map((c) => ({ customer_id: customerId, category_id: c.id, margin_bp: c.marginBp! }));
    const noMargin = p.categories.filter((c) => c.marginBp === null).map((c) => c.id);
    if (margins.length) await run("margins", supabase.from("customer_category_margins").upsert(margins));
    if (noMargin.length) await run("margins", supabase.from("customer_category_margins").delete().eq("customer_id", customerId).in("category_id", noMargin));

    const rules = Object.entries(p.productRules);
    const setRules = rules.filter(([, m]) => m !== null).map(([product_id, mode]) => ({ customer_id: customerId, product_id, mode: mode! }));
    const clearRules = rules.filter(([, m]) => m === null).map(([id]) => id);
    for (const c of chunks(setRules)) await run("rules", supabase.from("customer_product_rules").upsert(c));
    for (const c of chunks(clearRules, 200)) await run("rules", supabase.from("customer_product_rules").delete().eq("customer_id", customerId).in("product_id", c));

    const overrides = Object.entries(p.overrides);
    const setPrices = overrides.filter(([, v]) => v !== null).map(([variant_id, price]) => ({ customer_id: customerId, variant_id, price_pence: price! }));
    const clearPrices = overrides.filter(([, v]) => v === null).map(([id]) => id);
    for (const c of chunks(setPrices)) await run("overrides", supabase.from("customer_price_overrides").upsert(c));
    for (const c of chunks(clearPrices, 200)) await run("overrides", supabase.from("customer_price_overrides").delete().eq("customer_id", customerId).in("variant_id", c));
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath(`/admin/customers/${customerId}/pricing`);
  revalidatePath("/admin/customers");
  return { notice: "Saved. The restaurant sees these prices from their next page load." };
}

/**
 * Replace this restaurant's catalogue and prices with a copy of another's: categories, product
 * show/hide rules, default and category margins, and fixed prices.
 */
export async function copyPricing(customerId: string, fromId: string): Promise<PricingResult> {
  await requireRole("admin");
  if (!uuid.safeParse(customerId).success || !uuid.safeParse(fromId).success || customerId === fromId) return { error: "Choose another restaurant to copy from." };
  const supabase = await createClient();
  const { data: both } = await supabase.from("customers").select("id, business_name").in("id", [customerId, fromId]);
  const from = both?.find((c) => c.id === fromId);
  if (!from || !both?.some((c) => c.id === customerId)) return { error: "Not found." };

  const [priv, access, rules, margins, overrides] = await Promise.all([
    supabase.from("customer_private").select("default_margin_bp").eq("customer_id", fromId).maybeSingle(),
    supabase.from("customer_category_access").select("category_id").eq("customer_id", fromId),
    supabase.from("customer_product_rules").select("product_id, mode").eq("customer_id", fromId).limit(10000),
    supabase.from("customer_category_margins").select("category_id, margin_bp").eq("customer_id", fromId),
    supabase.from("customer_price_overrides").select("variant_id, price_pence").eq("customer_id", fromId).limit(10000),
  ]);
  if ([priv, access, rules, margins, overrides].some((r) => r.error)) return { error: "Could not read the other restaurant's prices." };

  // Not one transaction (PostgREST); each step replaces one table, so repeating the copy after a
  // failure gives the same end state.
  const steps: Array<[string, () => PromiseLike<{ error: { message: string } | null }>]> = [
    ["default margin", () => supabase.from("customer_private").upsert({ customer_id: customerId, default_margin_bp: priv.data?.default_margin_bp ?? null })],
    ["access", () => supabase.from("customer_category_access").delete().eq("customer_id", customerId)],
    ["access", () => supabase.from("customer_category_access").insert((access.data ?? []).map((a) => ({ customer_id: customerId, category_id: a.category_id })))],
    ["rules", () => supabase.from("customer_product_rules").delete().eq("customer_id", customerId)],
    ["rules", () => supabase.from("customer_product_rules").insert((rules.data ?? []).map((r) => ({ customer_id: customerId, product_id: r.product_id, mode: r.mode })))],
    ["margins", () => supabase.from("customer_category_margins").delete().eq("customer_id", customerId)],
    ["margins", () => supabase.from("customer_category_margins").insert((margins.data ?? []).map((m) => ({ customer_id: customerId, category_id: m.category_id, margin_bp: m.margin_bp })))],
    ["overrides", () => supabase.from("customer_price_overrides").delete().eq("customer_id", customerId)],
    ["overrides", () => supabase.from("customer_price_overrides").insert((overrides.data ?? []).map((o) => ({ customer_id: customerId, variant_id: o.variant_id, price_pence: o.price_pence })))],
  ];
  for (const [label, step] of steps) {
    const { error } = await step();
    if (error) {
      console.error(`copy pricing (${label}) failed`, error.message);
      return { error: `Copying stopped at ${label}. Run the copy again to finish it.` };
    }
  }
  revalidatePath(`/admin/customers/${customerId}/pricing`);
  return { notice: `Copied catalogue and prices from ${from.business_name}.` };
}
