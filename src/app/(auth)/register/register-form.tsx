"use client";
import { useActionState, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/auth/submit-button";
import type { FormState } from "@/lib/validation/auth";
import { register } from "./actions";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">{title}</legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(register, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-8" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      {/* Honeypot for bots: hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Section title="Your restaurant">
        <Field label="Restaurant or business name" required error={fe.business_name}>
          {(p) => <Input {...p} name="business_name" autoComplete="organization" defaultValue={v.business_name} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" required error={fe.contact_name}>
            {(p) => <Input {...p} name="contact_name" autoComplete="name" defaultValue={v.contact_name} />}
          </Field>
          <Field label="Phone" required error={fe.phone}>
            {(p) => <Input {...p} name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.phone} />}
          </Field>
        </div>
      </Section>

      <Section title="Delivery address">
        <Field label="Address line 1" required error={fe.address_line1}>
          {(p) => <Input {...p} name="address_line1" autoComplete="address-line1" defaultValue={v.address_line1} />}
        </Field>
        <Field label="Address line 2" error={fe.address_line2}>
          {(p) => <Input {...p} name="address_line2" autoComplete="address-line2" defaultValue={v.address_line2} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Field label="Town or city" required error={fe.city}>
            {(p) => <Input {...p} name="city" autoComplete="address-level2" defaultValue={v.city} />}
          </Field>
          <Field label="Postcode" required error={fe.postcode}>
            {(p) => (
              <Input {...p} name="postcode" autoComplete="postal-code" autoCapitalize="characters" defaultValue={v.postcode} />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Sign-in details">
        <Field label="Email" required error={fe.email} hint="We send order confirmations and invoices here.">
          {(p) => <Input {...p} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v.email} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" required error={fe.password} hint="8+ characters, with a letter and a number.">
            {(p) => <PasswordInput {...p} name="password" autoComplete="new-password" />}
          </Field>
          <Field label="Confirm password" required error={fe.confirm_password}>
            {(p) => <PasswordInput {...p} name="confirm_password" autoComplete="new-password" />}
          </Field>
        </div>
      </Section>

      <div className="space-y-3">
        <SubmitButton pendingText="Creating your account…">Create trade account</SubmitButton>
        <p className="text-center text-[13px] text-ink-muted">
          We review every account before prices are shown, usually the same working day.
        </p>
      </div>
    </form>
  );
}
