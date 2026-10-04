import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * A restaurant's own orders, read with the signed-in user's client through the customer_*
 * views (RLS: own approved customer only; no cost, no supplier identity, no admin notes).
 */
export async function getCustomerOrder(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data: order, error } = await supabase.from("customer_orders").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`order: ${error.message}`);
  if (!order) return null;
  const [items, deliveries, invoice, payments] = await Promise.all([
    supabase.from("customer_order_items").select("*").eq("order_id", id).order("sort"),
    supabase.from("customer_deliveries").select("*").eq("order_id", id),
    supabase.from("invoices").select("id, number, issued_at, voided_at").eq("order_id", id).maybeSingle(),
    supabase.from("customer_payment_history").select("*").eq("order_id", id).order("paid_on"),
  ]);
  for (const r of [items, deliveries, invoice, payments]) if (r.error) throw new Error(`order: ${r.error.message}`);

  // Deliveries in the order their lines appear in the basket.
  const firstSort = new Map<string, number>();
  for (const it of items.data ?? []) if (it.supplier_order_id && !firstSort.has(it.supplier_order_id)) firstSort.set(it.supplier_order_id, it.sort ?? 0);
  const parts = (deliveries.data ?? [])
    .filter((d) => d.id)
    .sort((a, b) => (firstSort.get(a.id!) ?? 0) - (firstSort.get(b.id!) ?? 0))
    .map((d) => ({ ...d, items: (items.data ?? []).filter((it) => it.supplier_order_id === d.id) }));

  return { order, items: items.data ?? [], parts, invoice: invoice.data, payments: payments.data ?? [] };
}

export async function getBankSettings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_settings")
    .select("bank_name, bank_account_name, bank_sort_code, bank_account_number, bank_iban")
    .maybeSingle();
  return data ?? { bank_name: null, bank_account_name: null, bank_sort_code: null, bank_account_number: null, bank_iban: null };
}
