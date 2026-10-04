"use server";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { echo, fieldErrorsOf, registerSchema, type FormState } from "@/lib/validation/auth";
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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/register/pending`,
      data: business,
    },
  });

  if (error && error.code !== "user_already_exists") {
    if (error.code === "weak_password") {
      return { fieldErrors: { password: [error.message] }, values };
    }
    if (error.code === "over_email_send_rate_limit") {
      return { error: "We could not send the confirmation email just now. Please try again in a few minutes.", values };
    }
    console.error("signUp failed", error.code, error.message);
    return { error: "Something went wrong creating your account. Please try again.", values };
  }
  redirect("/register/pending");
}
