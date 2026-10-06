import type { Metadata } from "next";
import { PlateMessage } from "@/components/brand/plate-message";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

/** A missing product or shelf: shown inside the public header and footer, so no second header. */
export default function PublicNotFound() {
  return (
    <PlateMessage
      ground="default"
      headingLevel={1}
      tab="404"
      title="We can't find that page"
      className="py-14 sm:py-20"
      actions={
        <>
          <LinkButton href="/catalogue">Browse catalogue</LinkButton>
          <LinkButton href="/" variant="secondary">Go to home</LinkButton>
        </>
      }
    >
      <p>The link may be old or mistyped. If you followed a link from us, let us know.</p>
    </PlateMessage>
  );
}
