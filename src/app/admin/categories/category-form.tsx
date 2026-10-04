"use client";
import { useActionState } from "react";
import { VatSelect } from "@/components/admin/vat-select";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert } from "@/components/ui/alert";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import type { FormState } from "@/lib/validation/auth";

export interface CategoryValues {
  name: string;
  slug: string;
  description: string;
  sort: number;
  default_vat_rate_bp: number;
  active: boolean;
}

export function CategoryForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: CategoryValues;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values;
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="@container space-y-4" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}
      <div className="grid gap-4 @lg:grid-cols-2">
        <Field label="Name" required error={fe.name}>
          {(p) => <Input {...p} name="name" defaultValue={v?.name ?? initial.name} />}
        </Field>
        <Field label="Web address" error={fe.slug} hint="Left blank, it is made from the name.">
          {(p) => <Input {...p} name="slug" defaultValue={v?.slug ?? initial.slug} placeholder="e.g. whole-spices" />}
        </Field>
      </div>
      <Field label="Description" error={fe.description} hint="Shown on the public category page.">
        {(p) => <Textarea {...p} name="description" rows={2} defaultValue={v?.description ?? initial.description} />}
      </Field>
      <div className="grid gap-4 @lg:grid-cols-2">
        <Field label="Default VAT for new sizes" error={fe.default_vat} hint="Each size can still have its own rate.">
          {(p) => <VatSelect {...p} name="default_vat" value={initial.default_vat_rate_bp} />}
        </Field>
        <Field label="Position" error={fe.sort} hint="Lower numbers come first.">
          {(p) => <Input {...p} name="sort" type="number" inputMode="numeric" min={0} max={9999} defaultValue={v?.sort ?? String(initial.sort)} />}
        </Field>
      </div>
      <Checkbox name="active" defaultChecked={v ? v.active === "on" : initial.active} label="Visible in the catalogue" />
      <div>
        <SubmitButton block={false} pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
