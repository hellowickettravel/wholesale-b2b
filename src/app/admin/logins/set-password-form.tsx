"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import type { FormState } from "@/lib/validation/auth";

/** "Set a new password" for one login, folded away until needed. */
export function SetPasswordForm({ action, email }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; email: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <details className="w-full">
      <summary className="cursor-pointer text-sm font-semibold text-primary">Set a new password</summary>
      <form action={formAction} className="space-y-3 pt-3" key={state.notice ?? "pw"}>
        {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
        {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}
        <Field label={`New password for ${email}`} error={state.fieldErrors?.password} hint="8+ characters with a letter and a number.">
          {(p) => <Input {...p} name="password" type="text" autoComplete="new-password" spellCheck={false} />}
        </Field>
        <SubmitButton block={false} size="sm" pendingText="Saving…">Save new password</SubmitButton>
      </form>
    </details>
  );
}
