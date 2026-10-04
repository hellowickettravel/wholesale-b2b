"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/auth/submit-button";
import type { FormState } from "@/lib/validation/auth";
import { signIn } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <input type="hidden" name="next" value={state.values?.next ?? next ?? ""} />
      <Field label="Email" error={fe.email}>
        {(p) => (
          <Input {...p} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} autoFocus />
        )}
      </Field>
      <Field label="Password" error={fe.password}>
        {(p) => <PasswordInput {...p} name="password" autoComplete="current-password" />}
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Forgotten your password?
        </Link>
      </div>
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
