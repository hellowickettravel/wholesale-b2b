"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { customerDetailsSchema, newCustomerSchema, statusChangeSchema } from "@/lib/validation/customer";
import { echo, fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import { requireRole } from "@/server/auth";
import { inviteLogin } from "@/server/invite";
import { hit } from "@/server/rate-limit";

const DETAIL_FIELDS = ["business_name", "contact_name", "email", "phone", "address_line1", "address_line2", "city", "postcode", "delivery_notes"];
const uuid = z.uuid();
type CustomerStatus = "pending" | "approved" | "rejected" | "suspended";

/** Allowed status moves (DECISIONS D28). */
const TRANSITIONS: Record<string, { from: CustomerStatus[]; to: CustomerStatus }> = {
  approve: { from: ["pending", "rejected"], to: "approved" },
  reject: { from: ["pending"], to: "rejected" },
  suspend: { from: ["approved"], to: "suspended" },
  reactivate: { from: ["suspended", "rejected"], to: "approved" },
};

function nullable(s: string) {
  return s === "" ? null : s;
}

function refreshCustomer(id: string) {
  revalidatePath("/admin", "layout"); // pending-approvals badge in the sidebar
  revalidatePath(`/admin/customers/${id}`);
}

/** Admin creates a restaurant directly: approved at once, every active category granted. */
export async function createCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole("admin");
  const values = echo(formData, [...DETAIL_FIELDS, "invite"]);
  const parsed = newCustomerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const v = parsed.data;
  const supabase = await createClient();

  if (v.invite) {
    if (!(await hit("invitePerAdmin", viewer.userId))) return { error: "Too many invites in the last hour.", values };
    const { data: existing } = await supabase.from("profiles").select("id").eq("email", v.email).maybeSingle();
    if (existing) return { fieldErrors: { email: ["Someone already has an account with this email."] }, values };
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      business_name: v.business_name,
      contact_name: nullable(v.contact_name),
      email: nullable(v.email),
      phone: nullable(v.phone),
      address_line1: nullable(v.address_line1),
      address_line2: nullable(v.address_line2),
      city: nullable(v.city),
      postcode: nullable(v.postcode),
      delivery_notes: nullable(v.delivery_notes),
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: viewer.userId,
    })
    .select("id")
    .single();
  if (error) return { error: "The customer could not be created.", values };

  const { data: categories } = await supabase.from("categories").select("id").eq("active", true);
  if (categories?.length) {
    await supabase.from("customer_category_access").insert(categories.map((c) => ({ customer_id: customer.id, category_id: c.id })));
  }

  if (v.invite) {
    const invited = await inviteLogin(supabase, { email: v.email, fullName: v.contact_name, role: "customer", customerId: customer.id });
    if (invited.error) {
      await supabase.from("customers").delete().eq("id", customer.id);
      return { error: invited.error, values };
    }
  }

  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${customer.id}?notice=${v.invite ? "invited" : "created"}`);
}

export async function updateCustomer(customerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(customerId).success) return { error: "Not found." };
  const values = echo(formData, DETAIL_FIELDS);
  const parsed = customerDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      business_name: v.business_name,
      contact_name: nullable(v.contact_name),
      email: nullable(v.email),
      phone: nullable(v.phone),
      address_line1: nullable(v.address_line1),
      address_line2: nullable(v.address_line2),
      city: nullable(v.city),
      postcode: nullable(v.postcode),
      delivery_notes: nullable(v.delivery_notes),
    })
    .eq("id", customerId);
  if (error) return { error: "The details could not be saved.", values };
  refreshCustomer(customerId);
  revalidatePath("/admin/customers");
  return { notice: "Saved." };
}

/**
 * Approve / reject / suspend / reactivate. Approval also grants the chosen categories and an
 * optional default margin. The restaurant is told by email (queued in email_log; sending is
 * Phase 8) and sees the outcome on its account page straight away.
 */
export async function changeStatus(customerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole("admin");
  if (!uuid.safeParse(customerId).success) return { error: "Not found." };
  const parsed = statusChangeSchema.safeParse({
    action: formData.get("action"),
    reason: formData.get("reason") ?? "",
    categories: formData.getAll("categories"),
    default_margin: formData.get("default_margin") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values: echo(formData, ["reason", "default_margin"]) };
  const { action, reason, categories, default_margin } = parsed.data;

  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("id, status, email, business_name").eq("id", customerId).maybeSingle();
  if (!customer) return { error: "Not found." };
  const move = TRANSITIONS[action];
  if (!move.from.includes(customer.status)) return { error: `A ${customer.status} account cannot be changed that way. Reload the page.` };

  const { data: changed, error } = await supabase
    .from("customers")
    .update({
      status: move.to,
      status_reason: move.to === "approved" ? null : reason,
      ...(move.to === "approved" ? { approved_at: new Date().toISOString(), approved_by: viewer.userId } : {}),
    })
    .eq("id", customerId)
    .eq("status", customer.status) // someone else changed it meanwhile -> no row updated
    .select("id");
  if (error) return { error: "The status could not be changed." };
  if (!changed?.length) return { error: "Someone else changed this account a moment ago. Reload the page." };

  if (action === "approve") {
    if (categories.length) {
      const { error: accessError } = await supabase
        .from("customer_category_access")
        .upsert(categories.map((id) => ({ customer_id: customerId, category_id: id })), { ignoreDuplicates: true });
      if (accessError) return { error: "Approved, but the categories could not be saved. Set them on the pricing page." };
    }
    if (default_margin !== undefined && default_margin !== null) {
      await supabase.from("customer_private").upsert({ customer_id: customerId, default_margin_bp: default_margin });
    }
  }

  if (customer.email && (action === "approve" || action === "reject")) {
    await supabase.from("email_log").insert({
      to_email: customer.email,
      template: action === "approve" ? "account_approved" : "account_rejected",
      subject: action === "approve" ? "Your trade account is approved" : "About your trade account application",
      status: "queued",
      entity: "customer",
      entity_id: customerId,
    });
  }

  refreshCustomer(customerId);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/approvals");
  const done = { approve: "Approved.", reject: "Application rejected.", suspend: "Account put on hold.", reactivate: "Account reactivated." };
  return { notice: done[action] };
}

export async function saveAdminNotes(customerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(customerId).success) return { error: "Not found." };
  const notes = String(formData.get("admin_notes") ?? "").trim();
  if (notes.length > 4000) return { fieldErrors: { admin_notes: ["Keep notes under 4000 characters."] }, values: { admin_notes: notes.slice(0, 4000) } };
  const supabase = await createClient();
  const { error } = await supabase.from("customer_private").upsert({ customer_id: customerId, admin_notes: notes || null });
  if (error) return { error: "The notes could not be saved." };
  refreshCustomer(customerId);
  return { notice: "Notes saved." };
}

export async function inviteCustomerLogin(customerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole("admin");
  if (!uuid.safeParse(customerId).success) return { error: "Not found." };
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")), full_name: z.string().trim().min(1, "Enter their name").max(200) })
    .safeParse(Object.fromEntries(formData));
  const values = echo(formData, ["email", "full_name"]);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  if (!(await hit("invitePerAdmin", viewer.userId))) return { error: "Too many invites in the last hour.", values };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", parsed.data.email).maybeSingle();
  if (existing) return { fieldErrors: { email: ["Someone already has an account with this email."] }, values };
  const invited = await inviteLogin(supabase, { email: parsed.data.email, fullName: parsed.data.full_name, role: "customer", customerId });
  if (invited.error) return { error: invited.error, values };
  refreshCustomer(customerId);
  return { notice: `Invitation sent to ${parsed.data.email}.` };
}
