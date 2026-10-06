import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { StatusPage } from "@/components/shell/status-page";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      ground="rice"
      title="We can't find that page"
      actions={
        <>
          <LinkButton href="/">Go to home</LinkButton>
          <LinkButton href="/catalogue" variant="secondary">Browse catalogue</LinkButton>
        </>
      }
    >
      The link may be old or mistyped. If you followed a link from us, let us know.
    </StatusPage>
  );
}
