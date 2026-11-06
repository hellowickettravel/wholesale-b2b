"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf, passwordSchema, type FormState } from "@/lib/validation/auth";
import { requireRole } from "@/server/auth";

/**
 * Login controls shared by the restaurant and supplier pages. Roles and links come from profiles in the
 * database; the browser only names the login.
 */
const uuid = z.uuid();

function refresh(p: { customer_id: string | null; supplier_id: string | null }) {
  revalidatePath("/admin/users");
  if (p.customer_id) revalidatePath(`/admin/customers/${p.customer_id}`);
  if (p.supplier_id) revalidatePath(`/admin/suppliers/${p.supplier_id}`);
}

/** Switch a login off (it can no longer sign in) or back on. An admin cannot switch off their own login. */
export async function setLoginActive(profileId: string, active: boolean): Promise<FormState> {
  const viewer = await requireRole("admin");
  if (!uuid.safeParse(profileId).success) return { error: "Not found." };
  if (profileId === viewer.userId && !active) return { error: "You cannot switch off your own login." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update({ active }).eq("id", profileId).select("customer_id, supplier_id");
  if (error || !data?.length) return { error: "Could not update. Try again." };
  refresh(data[0]);
  return { notice: active ? "Login switched on." : "Login switched off." };
}

/**
 * Give a restaurant or supplier login a new password, for people who forgot theirs and cannot use the email
 * reset (accounts made with "set a password now" often have no inbox the person reads). Never for admins.
 */
export async function setLoginPassword(profileId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole("admin");
  if (!uuid.safeParse(profileId).success) return { error: "Not found." };
  const parsed = z.object({ password: passwordSchema }).safeParse({ password: String(fd.get("password") ?? "") });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("role, customer_id, supplier_id").eq("id", profileId).maybeSingle();
  if (!p || (p.role !== "customer" && p.role !== "supplier")) return { error: "Only restaurant and supplier logins can be given a new password here." };
  const { error } = await createAdminClient().auth.admin.updateUserById(profileId, { password: parsed.data.password });
  if (error) {
    console.error("set password failed", error.code, error.message);
    return { error: error.code === "weak_password" ? "Choose a stronger password: 8+ characters with a letter and a number." : "The password could not be changed. Try again." };
  }
  refresh(p);
  return { notice: "New password saved. Tell them it privately, and ask them to change it on My account." };
}
