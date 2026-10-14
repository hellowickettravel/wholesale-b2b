"use server";
import { redirect } from "next/navigation";
import { isConfirmationEmailFailure } from "@/lib/auth-errors";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { echo, fieldErrorsOf, registerSchema, type FormState } from "@/lib/validation/auth";
import { flushEmails, queueAdminNewRegistration } from "@/server/email-queue";
import { clientIp, hit } from "@/server/rate-limit";

const FIELDS = ["business_name", "contact_name", "phone", "email", "address_line1", "address_line2", "city", "postcode"];

/**
 * Self-registration. Creates the auth user; the database trigger creates a PENDING customer
 * from the business details. The role is always "customer" (set in SQL, never from input).
 * The response is the same whether or not the email already has an account (no enumeration).
 */
export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echo(formData, FIELDS);
  // Honeypot: real people never see or fill this field.
  if (formData.get("website")) redirect("/register/pending");

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  if (!(await hit("registerPerIp", await clientIp()))) {
    return { error: "Too many registrations from this connection. Please try again in an hour.", values };
  }

  const { email, password, confirm_password: _c, ...business } = parsed.data;
  void _c;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/register/pending`,
      data: business,
    },
  });

  let userId = data?.user?.id;
  let held = false;
  if (error && error.code !== "user_already_exists") {
    if (error.code === "weak_password") {
      return { fieldErrors: { password: [error.message] }, values };
    }
    if (isConfirmationEmailFailure(error)) {
      // Supabase could not send the confirmation email (its mail sender is not set up, or it is down). The account is
      // still worth keeping: create it unconfirmed. We review every account by hand, and approving it confirms the
      // login, so the restaurant can sign in once approved without ever needing that email.
      const made = await createUnconfirmed(email, password, business);
      if (made.error) {
        console.error("signUp fallback failed", made.error);
        return { error: "Something went wrong creating your account. Please try again.", values };
      }
      userId = made.userId;
      held = true;
    } else if (error.code === "over_email_send_rate_limit") {
      return { error: "We could not send the confirmation email just now. Please try again in a few minutes.", values };
    } else {
      console.error("signUp failed", error.code, error.message);
      return { error: "Something went wrong creating your account. Please try again.", values };
    }
  }
  if (userId) await tellTheTeam(userId);
  redirect(held ? "/register/pending?held=1" : "/register/pending");
}

async function createUnconfirmed(email: string, password: string, business: Record<string, string | undefined>): Promise<{ userId?: string; error?: string }> {
  const { data, error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: business,
  });
  // The address already has an account: behave exactly like a fresh registration (no enumeration).
  if (error?.code === "email_exists") return {};
  if (error || !data.user) return { error: error?.message ?? "no user" };
  return { userId: data.user.id };
}

/** Best effort: email the team that a new application is waiting. Never blocks or fails the registration. */
async function tellTheTeam(userId: string): Promise<void> {
  try {
    const { data } = await createAdminClient().from("profiles").select("customer_id").eq("id", userId).maybeSingle();
    if (!data?.customer_id) return;
    await queueAdminNewRegistration(data.customer_id);
    flushEmails();
  } catch (e) {
    console.error("new-registration notice failed:", (e as Error).message);
  }
}
