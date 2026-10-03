import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emailLinkDestination } from "../redirects";

/**
 * PKCE fallback for the stock Supabase email templates ({{ .ConfirmationURL }} -> ?code=…).
 * Works when the link is opened in the browser that requested it.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(emailLinkDestination(request.nextUrl.searchParams.get("next")) ?? "/login");
  }
  redirect("/login?notice=link-expired");
}
