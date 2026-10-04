import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ProductRuleMode } from "@/domain/visibility";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { loadCustomerRules } from "@/server/pricing";
import { CustomerHeader } from "../customer-header";
import { PricingWorkbench, type WorkbenchData } from "./workbench";

export const metadata: Metadata = { title: "Catalogue & prices" };

/**
 * The key admin screen: which products a restaurant sees and at what price. Admin-only, so costs
 * are sent to this browser on purpose: the admin needs them to set margins and fixed prices.
 */
export default async function PricingPage({ params }: PageProps<"/admin/customers/[id]/pricing">) {
  await requireRole("admin");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("id, business_name, status").eq("id", id).maybeSingle();
  if (!customer) notFound();

  const [rules, { data: categories }, products, variants, { data: others }] = await Promise.all([
    loadCustomerRules(supabase, id),
    supabase.from("categories").select("id, name, active, sort").order("sort").order("name"),
    fetchAll((from, to) => supabase.from("products").select("id, name, category_id, active").order("name").order("id").range(from, to)),
    fetchAll((from, to) =>
      supabase.from("product_variants").select("id, product_id, size_label, size_sort, cost_pence, active").order("size_sort").order("id").range(from, to),
    ),
    supabase.from("customers").select("id, business_name").neq("id", id).in("status", ["approved", "suspended"]).order("business_name"),
  ]);

  const sizesByProduct = new Map<string, WorkbenchData["products"][number]["sizes"]>();
  for (const v of variants) {
    const list = sizesByProduct.get(v.product_id) ?? [];
    list.push({ id: v.id, label: v.size_label, costPence: v.cost_pence === null ? null : Number(v.cost_pence), active: v.active });
    sizesByProduct.set(v.product_id, list);
  }
  const counts = new Map<string, number>();
  for (const p of products) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);

  const data: WorkbenchData = {
    customerId: customer.id,
    globalMarginBp: rules.pricing.globalMarginBp,
    initial: {
      defaultMarginBp: rules.pricing.customerDefaultMarginBp,
      access: [...rules.visibility.categoryIds],
      categoryMarginsBp: rules.pricing.categoryMarginsBp,
      productRules: rules.visibility.productRules as Record<string, ProductRuleMode>,
      overridesPence: rules.pricing.overridesPence,
    },
    categories: (categories ?? []).map((c) => ({ id: c.id, name: c.name, active: c.active, productCount: counts.get(c.id) ?? 0 })),
    products: products.map((p) => ({ id: p.id, name: p.name, categoryId: p.category_id, active: p.active, sizes: sizesByProduct.get(p.id) ?? [] })),
    others: (others ?? []).map((o) => ({ id: o.id, name: o.business_name })),
  };

  return (
    <>
      <CustomerHeader id={customer.id} name={customer.business_name} status={customer.status} active="pricing" />
      <PricingWorkbench data={data} />
    </>
  );
}
