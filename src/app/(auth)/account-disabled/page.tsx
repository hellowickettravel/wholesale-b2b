import type { Metadata } from "next";
import { StatusPage } from "@/components/shell/status-page";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata: Metadata = { title: "Account disabled" };

export default function AccountDisabledPage() {
  return (
    <StatusPage title="This account is not active" actions={<SignOutButton className="h-11 cursor-pointer rounded-[var(--radius-md)] border-[1.5px] border-line-strong bg-raised px-4 text-base font-bold text-ink transition-colors hover:bg-sunken" />}>
      Your sign-in works, but the account has been switched off or is not linked to a business yet. Please contact us to have it reactivated.
    </StatusPage>
  );
}
