import "server-only";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

type LoginInput = { email: string; fullName: string; role: "customer" | "supplier" | "admin"; customerId?: string | null; supplierId?: string | null };

/**
 * Send a Supabase invite (template invite.html -> /auth/confirm -> /auth/invite to set a password)
 * and link the new login to its role and business record. The service role is used only for the
 * Auth admin API; the profile link is written with the ADMIN'S OWN client (RLS + audit log).
 * If linking fails the auth user is removed again, so a half-made login never exists.
 */
export async function inviteLogin(adminClient: Client, input: LoginInput): Promise<{ error?: string; userId?: string }> {
  const service = createAdminClient();
  const { data: invited, error } = await service.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.fullName },
    redirectTo: `${siteUrl()}/auth/invite`,
  });
  if (error || !invited.user) {
    console.error("invite failed", error?.code, error?.message);
    return { error: error?.code === "email_exists" ? "Someone already has an account with this email." : "The invitation email could not be sent. Please try again." };
  }
  return linkLogin(adminClient, invited.user.id, input);
}

/**
 * Create a login with a password the admin chooses, already confirmed, so the business can sign in at once
 * without any email (the admin passes the password on, e.g. on WhatsApp, and the customer changes it from
 * their account page). Same linking and clean-up as an invite.
 */
export async function createLoginWithPassword(adminClient: Client, input: LoginInput & { password: string }): Promise<{ error?: string; userId?: string }> {
  const service = createAdminClient();
  const { data, error } = await service.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error || !data.user) {
    console.error("create login failed", error?.code, error?.message);
    if (error?.code === "email_exists") return { error: "Someone already has an account with this email." };
    if (error?.code === "weak_password") return { error: "Choose a stronger password: 8+ characters with a letter and a number." };
    return { error: "The login could not be created. Please try again." };
  }
  return linkLogin(adminClient, data.user.id, input);
}

async function linkLogin(adminClient: Client, userId: string, input: LoginInput): Promise<{ error?: string; userId?: string }> {
  const service = createAdminClient();
  const { error: linkError } = await adminClient
    .from("profiles")
    .update({ role: input.role, customer_id: input.customerId ?? null, supplier_id: input.supplierId ?? null, full_name: input.fullName })
    .eq("id", userId);
  if (linkError) {
    await service.auth.admin.deleteUser(userId);
    console.error("linking new profile failed", linkError.message);
    return { error: "Could not finish setting up the login. Nothing was created; please try again." };
  }
  return { userId };
}

/**
 * When an admin approves a business, they have checked who it is: mark the business's logins as confirmed so
 * the owner can sign in even if the confirmation email never arrived (DECISIONS D47). Admin client reads the
 * linked profiles under RLS; the service role is used only for the Auth admin call.
 */
export async function confirmCustomerLogins(adminClient: Client, customerId: string): Promise<void> {
  const { data: logins } = await adminClient.from("profiles").select("id").eq("customer_id", customerId);
  const service = createAdminClient();
  for (const l of logins ?? []) {
    const { error } = await service.auth.admin.updateUserById(l.id, { email_confirm: true });
    if (error) console.error("confirm login failed", error.code, error.message);
  }
}
