"use server";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { echo, fieldErrorsOf, forgotSchema, type FormState } from "@/lib/validation/auth";
import { clientIp, hit } from "@/server/rate-limit";

/** Always answers the same way, whether or not the address has an account. */
export async function requestReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echo(formData, ["email"]);
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const { email } = parsed.data;

  const okIp = await hit("resetPerIp", await clientIp());
  const okAccount = await hit("resetPerAccount", email);
  if (okIp && okAccount) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
    });
    if (error && error.code !== "user_not_found") console.error("resetPasswordForEmail", error.code, error.message);
  } else if (!okIp) {
    return { error: "Too many requests from this connection. Please try again later.", values };
  }
  return { notice: email, values: {} };
}
