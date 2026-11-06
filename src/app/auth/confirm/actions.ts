"use server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, homeFor } from "@/server/auth";
import { emailLinkDestination } from "../redirects";

const TYPES: EmailOtpType[] = ["email", "signup", "invite", "recovery", "email_change"];

/**
 * Spends the one-time token from an auth email (which signs the user in), then forwards to an
 * allow-listed page. Runs only on the person's click (POST): link scanners such as Outlook Safe Links
 * open every link in an email with GET, and would otherwise use up the token before the person does.
 */
export async function confirmEmailLink(formData: FormData): Promise<void> {
  const tokenHash = String(formData.get("token_hash") ?? "").slice(0, 500);
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  if (tokenHash && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const target = emailLinkDestination(String(formData.get("next") ?? "") || null);
      if (target) redirect(target);
      const viewer = await getViewer();
      redirect(viewer ? homeFor(viewer) : "/login");
    }
  }
  redirect("/login?notice=link-expired");
}
