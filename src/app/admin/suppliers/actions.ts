"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addDays, compareIso, todayInLondon } from "@/domain/dates";
import { owedToSupplier } from "@/domain/ledger";
import { formatPence } from "@/domain/money";
import { createClient } from "@/lib/supabase/server";
import { echo, fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import { PAYMENT_METHODS, supplierSchema } from "@/lib/validation/admin-orders";
import { requireRole } from "@/server/auth";
import { inviteLogin } from "@/server/invite";
import { hit } from "@/server/rate-limit";

/** Supplier records, logins and paying them. Admin's own client throughout (RLS + audit log). */

const uuid = z.uuid();
const FIELDS = ["name", "email", "phone", "address", "notes"];

function row(v: z.infer<typeof supplierSchema>) {
  return { name: v.name, email: v.email || null, phone: v.phone || null, address: v.address || null, notes: v.notes || null };
}

function refresh(id?: string) {
  revalidatePath("/admin/suppliers");
  if (id) revalidatePath(`/admin/suppliers/${id}`);
}

export async function createSupplier(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole("admin");
  const values = echo(fd, FIELDS);
  const parsed = supplierSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").insert(row(parsed.data)).select("id").single();
  if (error) return { error: "The supplier could not be added.", values };
  refresh();
  redirect(`/admin/suppliers/${data.id}?notice=created`);
}

export async function updateSupplier(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(id).success) return { error: "Not found." };
  const values = echo(fd, FIELDS);
  const parsed = supplierSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").update(row(parsed.data)).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Could not save. Try again.", values };
  refresh(id);
  return { notice: "Saved.", values };
}

/** Switching a supplier off stops new orders for its sizes (D32); open orders carry on. */
export async function setSupplierActive(id: string, active: boolean): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(id).success) return { error: "Not found." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").update({ active }).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Could not update. Try again." };
  refresh(id);
  revalidatePath("/admin", "layout");
  return { notice: active ? "Supplier switched on." : "Supplier switched off. Restaurants cannot order its sizes until you switch it back on." };
}

export async function inviteSupplierLogin(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireRole("admin");
  if (!uuid.safeParse(id).success) return { error: "Not found." };
  const values = echo(fd, ["email", "full_name"]);
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")), full_name: z.string().trim().min(1, "Enter their name").max(200) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  if (!(await hit("invitePerAdmin", viewer.userId))) return { error: "Too many invites in the last hour.", values };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", parsed.data.email).maybeSingle();
  if (existing) return { fieldErrors: { email: ["Someone already has an account with this email."] }, values };
  const invited = await inviteLogin(supabase, { email: parsed.data.email, fullName: parsed.data.full_name, role: "supplier", supplierId: id });
  if (invited.error) return { error: invited.error, values };
  refresh(id);
  return { notice: `Invitation sent to ${parsed.data.email}.` };
}

/** Switch a login off (it can no longer sign in) or back on. An admin cannot switch off their own login. */
export async function setLoginActive(profileId: string, active: boolean): Promise<FormState> {
  const viewer = await requireRole("admin");
  if (!uuid.safeParse(profileId).success) return { error: "Not found." };
  if (profileId === viewer.userId && !active) return { error: "You cannot switch off your own login." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update({ active }).eq("id", profileId).select("supplier_id");
  if (error || !data?.length) return { error: "Could not update. Try again." };
  revalidatePath("/admin/users");
  refresh(data[0].supplier_id ?? undefined);
  return { notice: active ? "Login switched on." : "Login switched off." };
}

/**
 * "I paid the supplier": for each chosen part, record a payment of what is still owed and tick it
 * paid. One bank transfer can cover several orders, so they share the date and reference.
 */
export async function paySupplierParts(supplierId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireRole("admin");
  if (!uuid.safeParse(supplierId).success) return { error: "Not found." };
  const ids = fd.getAll("part").map(String).filter((s) => uuid.safeParse(s).success);
  const parsed = z
    .object({
      paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
      method: z.enum(PAYMENT_METHODS),
      reference: z.string().trim().max(200).optional().default(""),
    })
    .safeParse(Object.fromEntries(fd));
  const values = echo(fd, ["paid_on", "method", "reference"]);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  if (ids.length === 0) return { error: "Tick the orders you paid.", values };
  const today = todayInLondon();
  if (compareIso(parsed.data.paid_on, today) > 0 || compareIso(parsed.data.paid_on, addDays(today, -730)) < 0) return { fieldErrors: { paid_on: ["Check the date"] }, values };

  const supabase = await createClient();
  const [{ data: parts }, { data: lines }, { data: pays }] = await Promise.all([
    supabase.from("supplier_orders").select("id, order_id, status, paid_to_supplier").eq("supplier_id", supplierId).in("id", ids),
    supabase.from("order_items").select("supplier_order_id, qty, vat_rate_bp, unit_cost_pence").in("supplier_order_id", ids).is("removed_at", null),
    supabase.from("supplier_payments").select("supplier_order_id, amount_pence").in("supplier_order_id", ids),
  ]);
  const valid = (parts ?? []).filter((p) => p.status !== "cancelled" && !p.paid_to_supplier);
  if (valid.length !== ids.length) return { error: "Some of those orders are not this supplier's, are cancelled or are already paid. Reload the page.", values };
  const plan = valid.map((p) => {
    const owed = owedToSupplier((lines ?? []).filter((l) => l.supplier_order_id === p.id).map((l) => ({ qty: l.qty, vatRateBp: l.vat_rate_bp, unitCostPence: l.unit_cost_pence })));
    const paid = (pays ?? []).filter((x) => x.supplier_order_id === p.id).reduce((a, x) => a + x.amount_pence, 0);
    return { part: p, owed, left: owed.grossPence - paid };
  });
  if (plan.some((x) => x.owed.costMissing)) return { error: "An order has a line with no cost. Enter the cost on the order first.", values };

  const payments = plan
    .filter((x) => x.left > 0)
    .map((x) => ({
      supplier_order_id: x.part.id,
      supplier_id: supplierId,
      amount_pence: x.left,
      paid_on: parsed.data.paid_on,
      method: parsed.data.method,
      reference: parsed.data.reference || null,
      recorded_by: viewer.userId,
    }));
  if (payments.length) {
    const { error } = await supabase.from("supplier_payments").insert(payments);
    if (error) return { error: "Could not record the payments. Try again.", values };
  }
  const { error } = await supabase.from("supplier_orders").update({ paid_to_supplier: true, supplier_paid_at: new Date().toISOString() }).in("id", valid.map((p) => p.id));
  if (error) return { error: "Payments recorded, but the orders could not be ticked paid. Tick them on each order.", values };
  refresh(supplierId);
  for (const p of valid) revalidatePath(`/admin/orders/${p.order_id}`);
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  const total = plan.reduce((a, x) => a + Math.max(0, x.left), 0);
  return { notice: `Recorded ${formatPence(total)} for ${valid.length} order${valid.length === 1 ? "" : "s"}.` };
}
