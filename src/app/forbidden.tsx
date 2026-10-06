import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { StatusPage } from "@/components/shell/status-page";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata: Metadata = { title: "No access" };

export default function Forbidden() {
  return (
    <StatusPage
      code="403"
      ground="restaurant-packing-and-cleaning"
      title="You don't have access to this page"
      actions={
        <>
          <LinkButton href="/">Go to home</LinkButton>
          <SignOutButton label="Sign in as someone else" className="h-11 cursor-pointer rounded-[var(--radius-md)] border-[1.5px] border-line-strong bg-raised px-4 text-base font-bold text-ink transition-colors hover:bg-sunken" />
        </>
      }
    >
      This area belongs to a different kind of account. If you think this is a mistake, contact us.
    </StatusPage>
  );
}
