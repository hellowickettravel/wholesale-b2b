"use client";
import { useActionState, useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/auth/submit-button";
import type { FormState } from "@/lib/validation/auth";
import { confirmEnrolment, disableTwoStep, startEnrolment, type EnrolState } from "./actions";

const codeInput = "tabular text-center text-xl tracking-[0.4em]";

export function SecurityPanel({ enabled }: { enabled: boolean }) {
  return enabled ? <Enabled /> : <Setup />;
}

function Enabled() {
  const [state, action] = useActionState<FormState, FormData>(disableTwoStep, {});
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-sm text-ink">
        <Badge tone="success" dot>On</Badge> Signing in asks for a code from your authenticator app.
      </p>
      {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <form action={action} className="max-w-sm space-y-3" noValidate>
        <Field label="To switch it off, enter a current code" error={state.fieldErrors?.code}>
          {(p) => <Input {...p} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={codeInput} />}
        </Field>
        <SubmitButton block={false} pendingText="Checking…">Switch off two-step sign-in</SubmitButton>
      </form>
    </div>
  );
}

function Setup() {
  const [enrol, setEnrol] = useState<EnrolState | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Adds a second check at sign-in: after your password you type a 6-digit code from an app on your phone (Google Authenticator, Microsoft Authenticator, 1Password or similar). Anyone who learns your password still cannot open the admin area.
      </p>
      {enrol?.error ? <Alert tone="danger">{enrol.error}</Alert> : null}
      {!enrol?.factorId ? (
        <Button loading={pending} icon={<ShieldCheck className="size-4" aria-hidden="true" />} onClick={() => start(async () => setEnrol(await startEnrolment()))}>
          Set up two-step sign-in
        </Button>
      ) : (
        <Confirm enrol={enrol} />
      )}
    </div>
  );
}

function Confirm({ enrol }: { enrol: EnrolState }) {
  const [state, action] = useActionState<FormState, FormData>(confirmEnrolment.bind(null, enrol.factorId!), {});
  if (state.notice) return <Alert tone="success">{state.notice}</Alert>;
  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
      {/* The QR code is an inline SVG data URL from Supabase, so next/image has nothing to optimise. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={enrol.qr} alt="QR code to scan with your authenticator app" width={176} height={176} className="rounded-[var(--radius-md)] border border-line bg-white p-2" />
      <form action={action} className="space-y-3" noValidate>
        {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
        <p className="text-sm text-ink-muted">1. Scan the code with your authenticator app. Cannot scan? Type this key instead:</p>
        <p className="tabular break-all rounded-[var(--radius-md)] bg-sunken px-3 py-2 font-mono text-sm text-ink">{enrol.secret}</p>
        <Field label="2. Enter the 6-digit code it shows" error={state.fieldErrors?.code}>
          {(p) => <Input {...p} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={codeInput} />}
        </Field>
        <SubmitButton block={false} pendingText="Checking…">Turn on two-step sign-in</SubmitButton>
      </form>
    </div>
  );
}
