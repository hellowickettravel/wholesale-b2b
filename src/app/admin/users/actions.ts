"use server";
import { revalidatePath } from "next/cache";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { echo, fieldErrorsOf, inviteSchema, type FormState } from "@/lib/validation/auth";
import { requireRole } from "@/server/auth";
import { hit } from "@/server/rate-limit";

const FIELDS = ["email", "full_name", "role", "business_name", "supplier_id", "new_supplier_name"];

/**
 * Admin creates an account and Supabase emails an invite link (template: invite.html ->
 * /auth/confirm -> /auth/invite to set a password). Business records and the role link are
 * written with the ADMIN'S OWN client, so RLS applies and the audit log records the admin.
 * The service-role client is used only for the Auth admin API (sending the invite).
 */
export async function inviteUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole("admin");
  const values = echo(formData, FIELDS);
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const input = parsed.data;

  if (!(await hit("invitePerAdmin", viewer.userId))) return { error: "Too many invites in the last hour.", values };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", input.email).maybeSingle();
  if (existing) return { fieldErrors: { email: ["Someone already has an account with this email."] }, values };

  let customerId: string | null = null;
  let supplierId: string | null = null;
  let createdSupplier = false;

  if (input.role === "customer") {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        business_name: input.business_name,
        contact_name: input.full_name,
        email: input.email,
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: viewer.userId,
      })
      .select("id")
      .single();
    if (error) return { error: "Could not create the customer record.", values };
    customerId = data.id;
  } else if (input.role === "supplier") {
    if (input.supplier_id) {
      supplierId = input.supplier_id;
    } else {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({ name: input.new_supplier_name, email: input.email })
        .select("id")
        .single();
      if (error) return { error: "Could not create the supplier.", values };
      supplierId = data.id;
      createdSupplier = true;
    }
  }

  const undoRecords = async () => {
    if (customerId) await supabase.from("customers").delete().eq("id", customerId);
    if (createdSupplier && supplierId) await supabase.from("suppliers").delete().eq("id", supplierId);
  };

  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.full_name },
    redirectTo: `${siteUrl()}/auth/invite`,
  });
  if (inviteError || !invited.user) {
    await undoRecords();
    console.error("invite failed", inviteError?.code, inviteError?.message);
    return {
      error: inviteError?.code === "email_exists" ? "Someone already has an account with this email." : "The invitation email could not be sent. Please try again.",
      values,
    };
  }

  const { error: linkError } = await supabase
    .from("profiles")
    .update({ role: input.role, customer_id: customerId, supplier_id: supplierId, full_name: input.full_name })
    .eq("id", invited.user.id);
  if (linkError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    await undoRecords();
    console.error("linking invited profile failed", linkError.message);
    return { error: "Could not finish setting up the account. Nothing was created; please try again.", values };
  }

  revalidatePath("/admin/users");
  return { notice: `Invitation sent to ${input.email}.` };
}
