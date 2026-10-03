import type { Metadata } from "next";
import { AuthShell } from "@/components/shell/auth-shell";
import { LinkExpired } from "@/components/auth/link-expired";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { getViewer } from "@/server/auth";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const viewer = await getViewer();
  return (
    <AuthShell
      title="Choose a new password"
      description={viewer ? <>For <strong className="text-ink">{viewer.email}</strong>.</> : undefined}
    >
      {viewer ? <SetPasswordForm submitLabel="Save new password" /> : <LinkExpired />}
    </AuthShell>
  );
}
