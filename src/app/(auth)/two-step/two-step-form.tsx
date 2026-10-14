"use client";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/auth/submit-button";
import type { FormState } from "@/lib/validation/auth";
import { verifyTwoStep } from "./actions";

export function TwoStepForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(verifyTwoStep, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="6-digit code" error={state.fieldErrors?.code} hint="Open your authenticator app and type the code shown for Wholesale Street.">
        {(p) => <Input {...p} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} autoFocus className="tabular text-center text-xl tracking-[0.4em]" />}
      </Field>
      <SubmitButton pendingText="Checking…">Continue</SubmitButton>
    </form>
  );
}
