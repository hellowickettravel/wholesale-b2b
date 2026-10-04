import "server-only";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Send a Supabase invite (template invite.html -> /auth/confirm -> /auth/invite to set a password)
 * and link the new login to its role and business record. The service role is used only for the
 * Auth admin API; the profile link is written with the ADMIN'S OWN client (RLS + audit log).
 * If linking fails the auth user is removed again, so a half-made login never exists.
 */
export async function inviteLogin(
  adminClient: Client,
  input: { email: string; fullName: string; role: "customer" | "supplier" | "admin"; customerId?: string | null; supplierId?: string | null },
): Promise<{ error?: string; userId?: string }> {
  const service = createAdminClient();
  const { data: invited, error } = await service.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.fullName },
    redirectTo: `${siteUrl()}/auth/invite`,
  });
  if (error || !invited.user) {
    console.error("invite failed", error?.code, error?.message);
    return { error: error?.code === "email_exists" ? "Someone already has an account with this email." : "The invitation email could not be sent. Please try again." };
  }
  const { error: linkError } = await adminClient
    .from("profiles")
    .update({ role: input.role, customer_id: input.customerId ?? null, supplier_id: input.supplierId ?? null, full_name: input.fullName })
    .eq("id", invited.user.id);
  if (linkError) {
    await service.auth.admin.deleteUser(invited.user.id);
    console.error("linking invited profile failed", linkError.message);
    return { error: "Could not finish setting up the login. Nothing was created; please try again." };
  }
  return { userId: invited.user.id };
}
