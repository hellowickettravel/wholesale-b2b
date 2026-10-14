"use client";
import { useState, useTransition } from "react";
import { Mail, RefreshCw, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/validation/auth";
import { retryFailed, sendQueuedNow, sendTestEmail } from "./actions";

export function EmailTools({ queued, failed }: { queued: number; failed: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({});
  const run = (fn: () => Promise<FormState>) => start(async () => setState((await fn()) ?? {}));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={pending} onClick={() => run(sendTestEmail)} icon={<Mail className="size-4" aria-hidden="true" />}>Send me a test email</Button>
        <Button size="sm" variant="secondary" loading={pending} disabled={queued === 0} onClick={() => run(sendQueuedNow)} icon={<Send className="size-4" aria-hidden="true" />}>Send {queued} waiting</Button>
        <Button size="sm" variant="secondary" loading={pending} disabled={failed === 0} onClick={() => run(retryFailed)} icon={<RefreshCw className="size-4" aria-hidden="true" />}>Try {failed} failed again</Button>
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}
    </div>
  );
}
