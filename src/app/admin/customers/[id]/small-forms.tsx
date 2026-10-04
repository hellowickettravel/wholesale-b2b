"use client";
import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { FormState } from "@/lib/validation/auth";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function NotesForm({ action, initial }: { action: Action; initial: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}
      <Field label="Private notes" error={state.fieldErrors?.admin_notes} hint="Only admins see these.">
        {(p) => <Textarea {...p} name="admin_notes" rows={4} defaultValue={state.values?.admin_notes ?? initial} />}
      </Field>
      <SubmitButton block={false} pendingText="Saving…">Save notes</SubmitButton>
    </form>
  );
}

export function InviteLoginForm({ action, email, name }: { action: Action; email: string; name: string }) {
  const [state, formAction] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-3" key={state.notice ?? "invite"}>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}
      <Field label="Their name" error={fe.full_name}>
        {(p) => <Input {...p} name="full_name" autoComplete="off" defaultValue={state.values?.full_name ?? name} />}
      </Field>
      <Field label="Email" error={fe.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="off" defaultValue={state.values?.email ?? email} />}
      </Field>
      <SubmitButton block={false} pendingText="Sending…">Send login invitation</SubmitButton>
    </form>
  );
}
