"use client";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/auth/submit-button";
import type { FormState } from "@/lib/validation/auth";
import { setPassword } from "./set-password-action";

export function SetPasswordForm({ submitLabel, from, autoFocus = true }: { submitLabel: string; from?: "account"; autoFocus?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(setPassword, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {from ? <input type="hidden" name="from" value={from} /> : null}
      <Field label="New password" error={fe.password} hint="8+ characters, with a letter and a number.">
        {(p) => <PasswordInput {...p} name="password" autoComplete="new-password" autoFocus={autoFocus} />}
      </Field>
      <Field label="Confirm new password" error={fe.confirm_password}>
        {(p) => <PasswordInput {...p} name="confirm_password" autoComplete="new-password" />}
      </Field>
      <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
