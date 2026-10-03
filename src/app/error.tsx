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
      title="Something went wrong"
      actions={
        <>
          <Button onClick={() => retry()}>Try again</Button>
          <LinkButton href="/" variant="secondary">Go to home</LinkButton>
        </>
      }
    >
      Nothing you did caused this. Please try again in a moment.
      {error.digest ? <span className="mt-2 block font-mono text-xs text-ink-subtle">Reference: {error.digest}</span> : null}
    </StatusPage>
  );
}
