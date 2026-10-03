import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getViewer, homeFor } from "@/server/auth";
import { emailLinkDestination } from "../redirects";

const TYPES: EmailOtpType[] = ["email", "signup", "invite", "recovery", "email_change"];

/**
 * Landing point for every auth email (templates in supabase/templates). Verifies the one-time
 * token hash server-side, which signs the user in, then forwards to an allow-listed page.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const target = emailLinkDestination(params.get("next"));
      if (target) redirect(target);
      const viewer = await getViewer();
      redirect(viewer ? homeFor(viewer) : "/login");
    }
  }
  redirect("/login?notice=link-expired");
}
