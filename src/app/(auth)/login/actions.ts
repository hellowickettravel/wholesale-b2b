"use server";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { echo, fieldErrorsOf, loginSchema, type FormState } from "@/lib/validation/auth";
import { destinationFor, loadViewer } from "@/server/auth";
import { clientIp, hit } from "@/server/rate-limit";

const GENERIC = "Email or password is incorrect.";

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echo(formData, ["email", "next"]);
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const { email, password, next } = parsed.data;

  const ip = await clientIp();
  const [ipOk, accountOk] = [await hit("loginPerIp", ip), await hit("loginPerAccount", email)];
  if (!ipOk || !accountOk) {
    return { error: "Too many sign-in attempts. Wait 15 minutes, or reset your password.", values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/register/pending` },
      });
      return {
        error: "Please confirm your email address first. We have sent you a new confirmation link.",
        values,
      };
    }
    return { error: GENERIC, values };
  }

  const viewer = await loadViewer(supabase, data.user.id);
  if (!viewer) {
    await supabase.auth.signOut();
    return { error: "This account is not set up yet. Please contact us.", values };
  }
  redirect(destinationFor(viewer, next));
}
