"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf, setPasswordSchema, type FormState } from "@/lib/validation/auth";
import { homeFor, loadViewer } from "@/server/auth";
import { hit } from "@/server/rate-limit";

/**
 * Sets the password of the user signed in by a recovery or invite link (/auth/confirm put the
 * session in the cookie). Without that session nothing can be changed.
 */
export async function setPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "This link has expired. Ask for a new one from the sign-in page." };

  const parsed = setPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  if (!(await hit("passwordSetPerUser", userId))) return { error: "Too many attempts. Please try again later." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: ["Choose a password you haven't used here before."] } };
    if (error.code === "weak_password") return { fieldErrors: { password: [error.message] } };
    console.error("updateUser password", error.code, error.message);
    return { error: "We could not save your password. Please try again." };
  }
  const viewer = await loadViewer(supabase, userId);
  redirect(viewer ? homeFor(viewer) : "/login");
}
