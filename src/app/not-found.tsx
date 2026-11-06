import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { StatusPage } from "@/components/shell/status-page";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="We can't find that page"
      actions={
        <>
          <LinkButton href="/catalogue">Browse catalogue</LinkButton>
          <LinkButton href="/" variant="secondary">Go to home</LinkButton>
        </>
      }
    >
      The link may be old or mistyped. If you followed a link from us, let us know.
    </StatusPage>
  );
}
