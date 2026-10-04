"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addDays, buildOrder, compareIso, isDeliverable, MAX_LINE_QTY, promisedPayDate, todayInLondon } from "@/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validation/checkout";
import { requireRole } from "@/server/auth";
import { hit } from "@/server/rate-limit";
import { basketForOrder, canOrderVariant, getShopSettings } from "@/server/shop";

/** A restaurant's basket holds at most this many different sizes. */
const MAX_LINES = 150;

const uuid = z.uuid();
const qtySchema = z.number().int().min(0).max(MAX_LINE_QTY);

export type BasketResult = { ok: true; count: number } | { ok: false; error: string };

async function lineCount(supabase: Awaited<ReturnType<typeof createClient>>, customerId: string) {
  const { count } = await supabase.from("basket_items").select("variant_id", { count: "exact", head: true }).eq("customer_id", customerId);
  return count ?? 0;
}

/** Add `qty` of a size to the basket (adds to what is already there). */
export async function addToBasket(variantId: string, qty: number): Promise<BasketResult> {
  const viewer = await requireRole("customer");
  const customerId = viewer.customer!.id;
  if (!uuid.safeParse(variantId).success || !qtySchema.safeParse(qty).success || qty < 1) {
    return { ok: false, error: "Choose a quantity from 1 to 9,999." };
  }
  if (!(await canOrderVariant(customerId, variantId))) {
    return { ok: false, error: "This size cannot be ordered at the moment." };
  }
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("basket_items")
    .select("qty")
    .eq("customer_id", customerId)
    .eq("variant_id", variantId)
    .maybeSingle();
  if (readError) return { ok: false, error: "Could not update your basket. Try again." };
  if (!existing && (await lineCount(supabase, customerId)) >= MAX_LINES) {
    return { ok: false, error: `Your basket is full (${MAX_LINES} lines). Place this order first.` };
  }
  const { error } = await supabase
    .from("basket_items")
    .upsert({ customer_id: customerId, variant_id: variantId, qty: Math.min(MAX_LINE_QTY, (existing?.qty ?? 0) + qty) }, { onConflict: "customer_id,variant_id" });
  if (error) return { ok: false, error: "Could not update your basket. Try again." };
  refresh();
  return { ok: true, count: await lineCount(supabase, customerId) };
}

/** Set the quantity of a basket line; 0 removes it. */
export async function setBasketQty(variantId: string, qty: number): Promise<BasketResult> {
  const viewer = await requireRole("customer");
  const customerId = viewer.customer!.id;
  if (!uuid.safeParse(variantId).success || !qtySchema.safeParse(qty).success) {
    return { ok: false, error: "Choose a quantity from 1 to 9,999." };
  }
  const supabase = await createClient();
  const query =
    qty === 0
      ? supabase.from("basket_items").delete().eq("customer_id", customerId).eq("variant_id", variantId)
      : supabase.from("basket_items").update({ qty }).eq("customer_id", customerId).eq("variant_id", variantId);
  const { error } = await query;
  if (error) return { ok: false, error: "Could not update your basket. Try again." };
  if (qty === 0) refresh();
  return { ok: true, count: await lineCount(supabase, customerId) };
}

export interface CheckoutState {
  error?: string;
  fieldErrors?: Partial<Record<"delivery_date" | "payment_terms" | "pay_date" | "note", string>>;
  /** Set when the server's total differs from what the page showed. */
  totalChanged?: boolean;
}

/**
 * Place the order. Everything is recomputed here from the database: the basket rows (own
 * client, RLS), this restaurant's prices (server-only), settings and delivery days. The page's
 * total is only used to stop an order whose price changed since the restaurant last looked.
 */
export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const viewer = await requireRole("customer");
  const customerId = viewer.customer!.id;

  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fe: CheckoutState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as keyof NonNullable<CheckoutState["fieldErrors"]>;
      if (["delivery_date", "payment_terms", "pay_date", "note"].includes(k) && !fe[k]) fe[k] = issue.message;
    }
    return { error: Object.keys(fe).length ? "Check the highlighted fields." : "Something went wrong. Reload the page and try again.", fieldErrors: fe };
  }
  const input = parsed.data;

  if (!(await hit("orderPerCustomer", customerId))) {
    return { error: "Too many orders in a short time. Wait a few minutes or call us." };
  }

  // Already placed with this checkout (a resubmit after the first one went through)?
  const admin = createAdminClient();
  const { data: placed } = await admin
    .from("orders")
    .select("id")
    .eq("customer_id", customerId)
    .eq("checkout_key", input.checkout_key)
    .maybeSingle();
  if (placed) redirect(`/orders/${placed.id}/confirmed`);

  const supabase = await createClient();
  const { data: rows, error: basketError } = await supabase
    .from("basket_items")
    .select("variant_id, qty")
    .eq("customer_id", customerId)
    .order("created_at");
  if (basketError) return { error: "Could not read your basket. Try again." };
  if (!rows || rows.length === 0) return { error: "Your basket is empty." };

  const [priced, settings] = await Promise.all([basketForOrder(customerId, rows), getShopSettings(customerId)]);
  if (priced.lines.some((l) => l.problem)) {
    return { error: "Some items in your basket cannot be ordered now. Remove them, then place the order." };
  }

  const today = todayInLondon();
  if (!isDeliverable(input.delivery_date, today, settings.deliveryDays)) {
    return { error: "Check the highlighted fields.", fieldErrors: { delivery_date: "Choose one of the delivery dates offered." } };
  }
  let payDate: string;
  if (input.payment_terms === "on_date") {
    if (compareIso(input.pay_date, today) < 0 || compareIso(input.pay_date, addDays(input.delivery_date, 60)) > 0) {
      return {
        error: "Check the highlighted fields.",
        fieldErrors: { pay_date: "Choose a date from today up to 60 days after delivery." },
      };
    }
    payDate = input.pay_date;
  } else {
    payDate = promisedPayDate(input.payment_terms, input.delivery_date);
  }

  const order = buildOrder(priced.orderLines, settings.delivery);
  if (order.totals.totalPence !== input.expected_total) {
    refresh();
    return { error: "Your basket or prices changed. Check the new total, then place the order again.", totalChanged: true };
  }

  const t = order.totals;
  const payload = {
    customer_id: customerId,
    placed_by: viewer.userId,
    checkout_key: input.checkout_key,
    delivery_date: input.delivery_date,
    payment_terms: input.payment_terms,
    promised_pay_date: payDate,
    note: input.note || null,
    totals: {
      goods_net_pence: t.goodsNetPence,
      goods_vat_pence: t.goodsVatPence,
      delivery_net_pence: t.deliveryNetPence,
      delivery_vat_pence: t.deliveryVatPence,
      vat_pence: t.vatPence,
      total_pence: t.totalPence,
    },
    supplier_orders: order.supplierOrders.map((so) => ({
      supplier_id: so.supplierId,
      items: so.lines.map((l) => ({
        variant_id: l.variantId,
        product_id: l.productId,
        product_name: l.productName,
        size_label: l.sizeLabel,
        sku: l.sku,
        qty: l.qty,
        unit_price_pence: l.unitPricePence,
        unit_cost_pence: l.unitCostPence,
        vat_rate_bp: l.vatRateBp,
        line_net_pence: l.lineNetPence,
        line_vat_pence: l.lineVatPence,
      })),
    })),
  };

  let result = await admin.rpc("create_order_tx", { p: payload });
  // Two submits of the same checkout racing: the loser hits the unique key; asking again
  // returns the order the winner created.
  if (result.error?.code === "23505") result = await admin.rpc("create_order_tx", { p: payload });
  if (result.error || !result.data) {
    console.error("create_order_tx failed:", result.error?.message);
    return { error: "We could not place your order. Nothing was charged. Try again, or call us." };
  }
  const { order_id: orderId } = result.data as { order_id: string };

  // Empty the ordered lines (RLS: own basket). Anything added meanwhile in another tab stays.
  const { error: clearError } = await supabase
    .from("basket_items")
    .delete()
    .eq("customer_id", customerId)
    .in("variant_id", priced.orderLines.map((l) => l.variantId));
  if (clearError) console.error("basket clear failed:", clearError.message);

  redirect(`/orders/${orderId}/confirmed`);
}
