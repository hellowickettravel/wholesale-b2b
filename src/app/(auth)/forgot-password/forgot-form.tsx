"use client";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/auth/submit-button";
import type { FormState } from "@/lib/validation/auth";
import { requestReset } from "./actions";

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(requestReset, {});
  if (state.notice) {
    return (
      <div role="status" className="rounded-[var(--radius-lg)] border border-line bg-raised p-5">
        <MailCheck className="size-6 text-primary" aria-hidden="true" />
        <p className="mt-3 font-semibold text-ink">Check your email</p>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">
          If <strong className="text-ink">{state.notice}</strong> has an account, we have sent it a link to choose a new password. The link expires in one hour.
        </p>
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
