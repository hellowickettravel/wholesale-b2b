import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PricingRules } from "@/domain/pricing";
import type { ProductRuleMode, VisibilityRules } from "@/domain/visibility";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export interface CustomerRules {
  pricing: PricingRules;
  visibility: VisibilityRules;
}

/**
 * Everything that decides one restaurant's catalogue and prices. Needs a client that can read
 * admin-only tables: the admin's own client on admin screens, or the service-role client in
 * the shop after requireRole("customer") has fixed customerId to the viewer's own customer.
 * Never call it with a customerId taken from the request.
 */
export async function loadCustomerRules(client: Client, customerId: string): Promise<CustomerRules> {
  const [settings, priv, margins, overrides, access, rules] = await Promise.all([
    client.from("settings").select("global_margin_bp").single(),
    client.from("customer_private").select("default_margin_bp").eq("customer_id", customerId).maybeSingle(),
    client.from("customer_category_margins").select("category_id, margin_bp").eq("customer_id", customerId),
    client.from("customer_price_overrides").select("variant_id, price_pence").eq("customer_id", customerId).limit(10000),
    client.from("customer_category_access").select("category_id").eq("customer_id", customerId),
    client.from("customer_product_rules").select("product_id, mode").eq("customer_id", customerId).limit(10000),
  ]);
  for (const r of [settings, priv, margins, overrides, access, rules]) {
    if (r.error) throw new Error(`load customer rules: ${r.error.message}`);
  }
  return {
    pricing: {
      globalMarginBp: settings.data!.global_margin_bp,
      customerDefaultMarginBp: priv.data?.default_margin_bp ?? null,
      categoryMarginsBp: Object.fromEntries((margins.data ?? []).map((m) => [m.category_id, m.margin_bp])),
      overridesPence: Object.fromEntries((overrides.data ?? []).map((o) => [o.variant_id, Number(o.price_pence)])),
    },
    visibility: {
      categoryIds: new Set((access.data ?? []).map((a) => a.category_id)),
      productRules: Object.fromEntries((rules.data ?? []).map((r) => [r.product_id, r.mode as ProductRuleMode])),
    },
  };
}
