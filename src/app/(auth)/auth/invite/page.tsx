import type { Metadata } from "next";
import { AuthShell } from "@/components/shell/auth-shell";
import { LinkExpired } from "@/components/auth/link-expired";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { getViewer } from "@/server/auth";

export const metadata: Metadata = { title: "Set up your account" };

export default async function InvitePage() {
  const viewer = await getViewer();
  const firstName = viewer?.fullName?.split(" ")[0];
  return (
    <AuthShell
      title={firstName ? `Welcome, ${firstName}` : "Set up your account"}
      description={
        viewer ? (
          <>
            Your account <strong className="text-ink">{viewer.email}</strong> is ready
            {viewer.customer ? <> for {viewer.customer.businessName}</> : viewer.supplier ? <> for {viewer.supplier.name}</> : null}. Choose a password to finish.
          </>
        ) : undefined
      }
    >
      {viewer ? <SetPasswordForm submitLabel="Set password and continue" /> : <LinkExpired />}
    </AuthShell>
  );
}
