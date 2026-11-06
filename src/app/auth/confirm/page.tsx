import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/auth/submit-button";
import { AuthShell } from "@/components/shell/auth-shell";
import { confirmEmailLink } from "./actions";

export const metadata: Metadata = { title: "Continue", robots: { index: false, follow: false } };

const COPY: Record<string, { title: string; text: string; button: string }> = {
  email: { title: "Confirm your email", text: "One more tap to confirm your email address.", button: "Confirm my email" },
  signup: { title: "Confirm your email", text: "One more tap to confirm your email address.", button: "Confirm my email" },
  invite: { title: "Set up your account", text: "Continue to choose your password.", button: "Continue" },
  recovery: { title: "Reset your password", text: "Continue to choose a new password.", button: "Continue" },
  email_change: { title: "Confirm your new email", text: "One more tap to confirm your new email address.", button: "Confirm" },
};

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Landing point for every auth email (templates in supabase/templates). Opening the link does nothing by
 * itself: the token is only spent when the person presses the button (see actions.ts for why).
 */
export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const sp = await searchParams;
  const tokenHash = one(sp.token_hash);
  const type = one(sp.type);
  const copy = COPY[type];
  if (!tokenHash || !copy) redirect("/login?notice=link-expired");
  return (
    <AuthShell title={copy.title} description={copy.text}>
      <form action={confirmEmailLink}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={one(sp.next)} />
        <SubmitButton pendingText="One moment…">{copy.button}</SubmitButton>
      </form>
    </AuthShell>
  );
}
