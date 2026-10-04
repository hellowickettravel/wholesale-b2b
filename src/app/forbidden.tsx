import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { StatusPage } from "@/components/shell/status-page";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata: Metadata = { title: "No access" };

export default function Forbidden() {
  return (
    <StatusPage
      code="403"
      title="You don't have access to this page"
      actions={
        <>
          <LinkButton href="/">Go to home</LinkButton>
          <SignOutButton label="Sign in as someone else" className="h-10 rounded-[var(--radius-md)] border border-line-strong bg-raised px-4 font-semibold text-ink hover:bg-sunken" />
        </>
      }
    >
      This area belongs to a different kind of account. If you think this is a mistake, contact us.
    </StatusPage>
  );
}
