"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { LinkResult } from "@/components/delivery/driver-link";
import { addDays, compareIso, todayInLondon } from "@/domain/dates";
import { nextChaseAfterReminder, owedToSupplier, rebuildOrder } from "@/domain/ledger";
import { parsePounds } from "@/domain/money";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import { cancelSchema, chaseSchema, paymentSchema, readLineEdits } from "@/lib/validation/admin-orders";
import { requireRole } from "@/server/auth";
import { createDriverLink, submitProof, type ProofResult } from "@/server/delivery";
import { hit } from "@/server/rate-limit";

/**
 * Admin order actions. requireRole("admin") first; simple writes go through the admin's OWN
 * client (RLS admin_all, audit log records auth.uid()); multi-row changes go through the
 * server-only SQL functions with the admin as actor (migration 0009).
 */

const uuid = z.uuid();

function refresh(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}

function checkDate(iso: string, today: string, field: string): Record<string, string[]> | null {
  if (compareIso(iso, today) > 0) return { [field]: ["Cannot be in the future"] };
  if (compareIso(iso, addDays(today, -730)) < 0) return { [field]: ["More than two years ago: check the date"] };
  return null;
}

/** Quantities, taking lines off, moving a line to another supplier, costs and the delivery charge. */
export async function editOrder(orderId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireRole("admin");
  if (!uuid.safeParse(orderId).success) return { error: "Order not found." };
  const supabase = await createClient();
  const [{ data: order }, { data: lines }, { data: settings }] = await Promise.all([
    supabase.from("orders").select("id, updated_at, delivery_net_pence").eq("id", orderId).maybeSingle(),
    supabase.from("order_items").select("id, supplier_id, qty, unit_price_pence, unit_cost_pence, vat_rate_bp").eq("order_id", orderId).is("removed_at", null).order("sort"),
    supabase.from("settings").select("delivery_vat_mode, delivery_fixed_vat_bp").single(),
  ]);
  if (!order || !lines || !settings) return { error: "Order not found." };

  const { edits, errors } = readLineEdits(fd, lines.map((l) => l.id));
  const deliveryRaw = String(fd.get("delivery_charge") ?? "").trim();
  const deliveryPence = deliveryRaw === "" ? 0 : parsePounds(deliveryRaw);
  if (deliveryPence === null || deliveryPence < 0 || deliveryPence > 100_000) errors.delivery_charge = "Enter a charge, like 12.00 (0 for free delivery)";
  if (Object.keys(errors).length) return { error: "Check the highlighted fields.", fieldErrors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, [v]])) };
  if (edits.every((e) => e.qty === 0)) return { error: "Every line would be taken off. Cancel the order instead." };

  const byId = new Map(lines.map((l) => [l.id, l]));
  const changed =
    deliveryPence !== order.delivery_net_pence ||
    edits.some((e) => {
      const l = byId.get(e.id)!;
      return e.qty !== l.qty || e.supplierId !== l.supplier_id || e.unitCostPence !== l.unit_cost_pence;
    });
  if (!changed) return { notice: "Nothing changed." };

  let rebuilt;
  try {
    rebuilt = rebuildOrder(
      edits.map((e) => ({ id: e.id, supplierId: e.supplierId, qty: e.qty, unitPricePence: byId.get(e.id)!.unit_price_pence, unitCostPence: e.unitCostPence, vatRateBp: byId.get(e.id)!.vat_rate_bp })),
      { chargePence: deliveryPence!, vatMode: settings.delivery_vat_mode, fixedVatBp: settings.delivery_fixed_vat_bp },
    );
  } catch {
    return { error: "Those quantities are not valid." };
  }
  const t = rebuilt.totals;
  const { error } = await createAdminClient().rpc("admin_edit_order", {
    p: {
      order_id: orderId,
      actor: viewer.userId,
      expected_updated_at: String(fd.get("expected_updated_at") ?? ""),
      totals: {
        goods_net_pence: t.goodsNetPence,
        goods_vat_pence: t.goodsVatPence,
        delivery_net_pence: t.deliveryNetPence,
        delivery_vat_pence: t.deliveryVatPence,
        vat_pence: t.vatPence,
        total_pence: t.totalPence,
      },
      lines: rebuilt.lines.map((l) => ({
        id: l.id,
        qty: l.qty,
        supplier_id: l.supplierId,
        unit_cost_pence: l.unitCostPence,
        line_net_pence: l.lineNetPence,
        line_vat_pence: l.lineVatPence,
      })),
    },
  });
  if (error) {
    if (error.code === "P0003") return { error: "This order can no longer be changed: a delivery has been made, or it is completed or cancelled." };
    if (error.code === "P0004") return { error: "Someone changed this order while you were editing. Reload the page and try again." };
    if (error.message.includes("supplier is not active")) return { error: "That supplier is switched off. Choose an active supplier." };
    console.error("admin_edit_order:", error.message);
    return { error: "Could not save the changes. Try again." };
  }
  refresh(orderId);
  return { notice: "Order updated. The suppliers involved and the restaurant have been told." };
}

export async function cancelOrder(orderId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireRole("admin");
  if (!uuid.safeParse(orderId).success) return { error: "Order not found." };
  const parsed = cancelSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values: { reason: String(fd.get("reason") ?? "") } };
  const { error } = await createAdminClient().rpc("admin_cancel_order", { p_order: orderId, p_actor: viewer.userId, p_reason: parsed.data.reason });
  if (error) {
    if (error.code === "P0003") return { error: "This order can no longer be cancelled: a delivery has been made, or it is already closed." };
    console.error("admin_cancel_order:", error.message);
    return { error: "Could not cancel the order. Try again." };
  }
  refresh(orderId);
  return { notice: "Order cancelled. Suppliers and the restaurant have been told." };
}

/** Delivered → completed (the admin's "this one is done"). */
export async function completeOrder(orderId: string): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(orderId).success) return { error: "Order not found." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "completed", completed_at: new Date().toISOString(), next_chase_date: null })
    .eq("id", orderId)
    .eq("status", "delivered")
    .select("id");
  if (error || !data?.length) return { error: "Only a delivered order can be marked completed." };
  refresh(orderId);
  return { notice: "Order marked completed." };
}

export async function saveChase(orderId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(orderId).success) return { error: "Order not found." };
  const values = { promised_pay_date: String(fd.get("promised_pay_date") ?? ""), next_chase_date: String(fd.get("next_chase_date") ?? ""), payment_notes: String(fd.get("payment_notes") ?? "") };
  const parsed = chaseSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({
      promised_pay_date: parsed.data.promised_pay_date || null,
      next_chase_date: parsed.data.next_chase_date || null,
      payment_notes: parsed.data.payment_notes || null,
    })
    .eq("id", orderId)
    .select("id");
  if (error || !data?.length) return { error: "Could not save. Try again.", values };
  refresh(orderId);
  return { notice: "Saved.", values };
}

/** Money in from the restaurant, or a refund (recorded as a negative payment). */
export async function recordCustomerPayment(orderId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireRole("admin");
  if (!uuid.safeParse(orderId).success) return { error: "Order not found." };
  const values = Object.fromEntries(["amount", "paid_on", "method", "reference", "note", "refund"].map((k) => [k, String(fd.get(k) ?? "")]));
  const parsed = paymentSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const today = todayInLondon();
  const bad = checkDate(parsed.data.paid_on, today, "paid_on");
  if (bad) return { fieldErrors: bad, values };
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("id, customer_id").eq("id", orderId).maybeSingle();
  if (!order) return { error: "Order not found." };
  const v = parsed.data;
  const { error } = await supabase.from("customer_payments").insert({
    order_id: order.id,
    customer_id: order.customer_id,
    amount_pence: v.refund ? -v.amount : v.amount,
    paid_on: v.paid_on,
    method: v.method,
    reference: v.reference || null,
    note: v.note || null,
    recorded_by: viewer.userId,
  });
  if (error) {
    console.error("customer payment:", error.message);
    return { error: "Could not record the payment. Try again.", values };
  }
  // Paid in full: nothing left to chase.
  const { data: sum } = await supabase.from("admin_order_summary").select("balance_pence").eq("id", orderId).single();
  if (sum && (sum.balance_pence ?? 0) <= 0) await supabase.from("orders").update({ next_chase_date: null }).eq("id", orderId);
  refresh(orderId);
  return { notice: v.refund ? "Refund recorded." : "Payment recorded." };
}

/** A payment to the supplier for its part of this order. Ticks "paid" once it covers what is owed. */
export async function recordSupplierPayment(supplierOrderId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireRole("admin");
  if (!uuid.safeParse(supplierOrderId).success) return { error: "Not found." };
  const values = Object.fromEntries(["amount", "paid_on", "method", "reference", "note"].map((k) => [k, String(fd.get(k) ?? "")]));
  const parsed = paymentSchema.omit({ refund: true }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const bad = checkDate(parsed.data.paid_on, todayInLondon(), "paid_on");
  if (bad) return { fieldErrors: bad, values };
  const supabase = await createClient();
  const { data: so } = await supabase.from("supplier_orders").select("id, order_id, supplier_id").eq("id", supplierOrderId).maybeSingle();
  if (!so) return { error: "Not found." };
  const v = parsed.data;
  const { error } = await supabase.from("supplier_payments").insert({
    supplier_order_id: so.id,
    supplier_id: so.supplier_id,
    amount_pence: v.amount,
    paid_on: v.paid_on,
    method: v.method,
    reference: v.reference || null,
    note: v.note || null,
    recorded_by: viewer.userId,
  });
  if (error) {
    console.error("supplier payment:", error.message);
    return { error: "Could not record the payment. Try again.", values };
  }
  await markPaidIfCovered(supabase, so.id);
  refresh(so.order_id);
  revalidatePath(`/admin/suppliers/${so.supplier_id}`);
  return { notice: "Supplier payment recorded." };
}

async function markPaidIfCovered(supabase: Awaited<ReturnType<typeof createClient>>, supplierOrderId: string) {
  const [{ data: lines }, { data: pays }] = await Promise.all([
    supabase.from("order_items").select("qty, vat_rate_bp, unit_cost_pence").eq("supplier_order_id", supplierOrderId).is("removed_at", null),
    supabase.from("supplier_payments").select("amount_pence").eq("supplier_order_id", supplierOrderId),
  ]);
  const owed = owedToSupplier((lines ?? []).map((l) => ({ qty: l.qty, vatRateBp: l.vat_rate_bp, unitCostPence: l.unit_cost_pence })));
  const paid = (pays ?? []).reduce((a, p) => a + p.amount_pence, 0);
  if (!owed.costMissing && owed.grossPence > 0 && paid >= owed.grossPence) {
    await supabase.from("supplier_orders").update({ paid_to_supplier: true, supplier_paid_at: new Date().toISOString() }).eq("id", supplierOrderId).eq("paid_to_supplier", false);
  }
}

/** The "paid to supplier" tick, set or cleared by hand. */
export async function setSupplierPaid(supplierOrderId: string, paid: boolean): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(supplierOrderId).success) return { error: "Not found." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supplier_orders")
    .update({ paid_to_supplier: paid, supplier_paid_at: paid ? new Date().toISOString() : null })
    .eq("id", supplierOrderId)
    .select("order_id, supplier_id");
  if (error || !data?.length) return { error: "Could not update. Try again." };
  refresh(data[0].order_id);
  revalidatePath(`/admin/suppliers/${data[0].supplier_id}`);
  return { notice: paid ? "Marked paid." : "Marked unpaid." };
}

/** Queue a payment reminder email (sent in Phase 8) and move the chase date on. At most one per order in 20 hours. */
export async function sendReminder(orderId: string): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(orderId).success) return { error: "Order not found." };
  const supabase = await createClient();
  const { data: o } = await supabase.from("admin_order_summary").select("id, number, customer_id, status, balance_pence, next_chase_date").eq("id", orderId).maybeSingle();
  if (!o || o.status === "cancelled" || (o.balance_pence ?? 0) <= 0) return { error: "Nothing is owed on this order." };
  const { data: c } = await supabase.from("customers").select("email").eq("id", o.customer_id!).single();
  if (!c?.email) return { error: "This restaurant has no email address. Add one on its customer page." };
  const today = todayInLondon();
  const { count } = await supabase
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .eq("template", "payment_reminder")
    .eq("entity_id", orderId)
    .gte("created_at", new Date(Date.now() - 20 * 3600_000).toISOString());
  if (count) return { error: "A reminder already went out in the last day." };
  const { error } = await supabase.from("email_log").insert({
    to_email: c.email,
    template: "payment_reminder",
    subject: `Payment reminder: ORDER-${o.number}`,
    status: "queued",
    entity: "order",
    entity_id: orderId,
  });
  if (error) return { error: "Could not queue the reminder. Try again." };
  await supabase.from("orders").update({ next_chase_date: nextChaseAfterReminder(today) }).eq("id", orderId);
  refresh(orderId);
  return { notice: "Reminder queued. Next chase moved on three days." };
}

export async function adminDriverLink(supplierOrderId: string): Promise<LinkResult> {
  const viewer = await requireRole("admin");
  if (!uuid.safeParse(supplierOrderId).success) return { error: "Not found." };
  if (!(await hit("driverLinkPerUser", viewer.userId))) return { error: "Too many links in a short time. Wait a few minutes." };
  const supabase = await createClient();
  const { data: so } = await supabase.from("supplier_orders").select("id, order_id, status").eq("id", supplierOrderId).maybeSingle();
  if (!so) return { error: "Not found." };
  if (so.status === "delivered" || so.status === "cancelled") return { error: "This delivery is closed." };
  try {
    const { token, expiresAt } = await createDriverLink(supplierOrderId, viewer.userId);
    refresh(so.order_id);
    return { url: `${siteUrl()}/d/${token}`, expiresAt };
  } catch (e) {
    console.error((e as Error).message);
    return { error: "Could not create the link. Try again." };
  }
}

/** The admin records a proof (also on a part already delivered, to replace a poor one: D36). */
export async function adminUploadProof(supplierOrderId: string, fd: FormData): Promise<ProofResult> {
  const viewer = await requireRole("admin");
  if (!uuid.safeParse(supplierOrderId).success) return { ok: false, error: "Not found." };
  const supabase = await createClient();
  const { data: so } = await supabase.from("supplier_orders").select("id, order_id").eq("id", supplierOrderId).maybeSingle();
  if (!so) return { ok: false, error: "Not found." };
  const r = await submitProof(fd, { supplierOrderId, proofId: null, kind: "admin", actorId: viewer.userId });
  if (r.ok) refresh(so.order_id);
  return r;
}
