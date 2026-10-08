"use client";
import { useActionState } from "react";
import { LoginChoice } from "@/components/admin/login-choice";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { FormState } from "@/lib/validation/auth";

export type CustomerDetails = Record<
  "business_name" | "contact_name" | "email" | "phone" | "address_line1" | "address_line2" | "city" | "postcode" | "delivery_notes",
  string
>;

export function CustomerForm({
  action,
  initial,
  submitLabel,
  withInvite = false,
  inviteOnly = false,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: CustomerDetails;
  submitLabel: string;
  withInvite?: boolean;
  /** Short form for "Invite a customer": business, contact, email, phone and how they sign in. */
  inviteOnly?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values;
  const fe = state.fieldErrors ?? {};
  const val = (k: keyof CustomerDetails) => v?.[k] ?? initial[k];
  return (
    <form action={formAction} className="@container space-y-4" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}
      <Field label="Restaurant or business name" required error={fe.business_name}>
        {(p) => <Input {...p} name="business_name" defaultValue={val("business_name")} />}
      </Field>
      <div className="grid gap-4 @lg:grid-cols-2">
        <Field label="Contact name" required={withInvite} error={fe.contact_name}>
          {(p) => <Input {...p} name="contact_name" autoComplete="off" defaultValue={val("contact_name")} />}
        </Field>
        <Field label="Phone" error={fe.phone}>
          {(p) => <Input {...p} name="phone" type="tel" autoComplete="off" defaultValue={val("phone")} />}
        </Field>
      </div>
      <Field label="Email" required={withInvite} error={fe.email} hint="Their sign-in. Order and invoice emails go here too.">
        {(p) => <Input {...p} name="email" type="email" autoComplete="off" defaultValue={val("email")} />}
      </Field>
      {inviteOnly ? null : (
        <>
          <div className="grid gap-4 @lg:grid-cols-2">
            <Field label="Address" error={fe.address_line1}>
              {(p) => <Input {...p} name="address_line1" defaultValue={val("address_line1")} />}
            </Field>
            <Field label="Address line 2" error={fe.address_line2}>
              {(p) => <Input {...p} name="address_line2" defaultValue={val("address_line2")} />}
            </Field>
            <Field label="Town or city" error={fe.city}>
              {(p) => <Input {...p} name="city" defaultValue={val("city")} />}
            </Field>
            <Field label="Postcode" error={fe.postcode}>
              {(p) => <Input {...p} name="postcode" autoCapitalize="characters" defaultValue={val("postcode")} />}
            </Field>
          </div>
          <Field label="Delivery notes" error={fe.delivery_notes} hint="Shown to suppliers with every order, e.g. back door, deliver before 11am.">
            {(p) => <Textarea {...p} name="delivery_notes" rows={2} defaultValue={val("delivery_notes")} />}
          </Field>
        </>
      )}
      {withInvite ? <LoginChoice allowNone={!inviteOnly} defaultMode={(v?.login as "invite" | "password" | "none" | undefined) ?? "invite"} passwordError={fe.password} /> : null}
      <div>
        <SubmitButton block={false} pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
