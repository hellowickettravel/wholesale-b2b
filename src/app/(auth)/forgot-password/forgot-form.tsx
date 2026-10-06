"use client";
import { useActionState } from "react";
import { PlateMessage } from "@/components/brand/plate-message";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/auth/submit-button";
import type { FormState } from "@/lib/validation/auth";
import { requestReset } from "./actions";

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(requestReset, {});
  if (state.notice) {
    return (
      <div role="status">
        <PlateMessage fit="full" title="Check your email">
          <p>
            If <strong className="font-bold text-ink">{state.notice}</strong> has an account, we have sent it a link to choose a new password. The link expires in one hour.
          </p>
        </PlateMessage>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label="Email" error={state.fieldErrors?.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} autoFocus />}
      </Field>
      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}
