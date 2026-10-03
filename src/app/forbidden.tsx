import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { StatusPage } from "@/components/shell/status-page";

export const metadata: Metadata = { title: "No access" };

export default function Forbidden() {
  return (
    <StatusPage
      code="403"
      title="You don't have access to this page"
      actions={
        <>
          <LinkButton href="/">Go to home</LinkButton>
          <LinkButton href="/login" variant="secondary">Sign in as someone else</LinkButton>
        </>
      }
    >
      This area belongs to a different kind of account. If you think this is a mistake, contact us.
    </StatusPage>
  );
}
