"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { StatusPage } from "@/components/shell/status-page";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <StatusPage
      ground="powders-and-ground-masala"
      title="Something went wrong"
      actions={
        <>
          <Button onClick={() => retry()}>Try again</Button>
          <LinkButton href="/" variant="secondary">Go to home</LinkButton>
        </>
      }
    >
      Nothing you did caused this. Please try again in a moment.
      {error.digest ? <span className="tabular mt-3 block text-sm text-ink-muted">Reference: {error.digest}</span> : null}
    </StatusPage>
  );
}
