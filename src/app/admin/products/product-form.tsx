"use client";
import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert } from "@/components/ui/alert";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import type { FormState } from "@/lib/validation/auth";

export interface ProductValues {
  name: string;
  slug: string;
  category_id: string;
  description: string;
  active: boolean;
}

export function ProductForm({
  action,
  initial,
  categories,
  submitLabel,
  showSlug = true,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: ProductValues;
  categories: { id: string; name: string; active: boolean }[];
  submitLabel: string;
  showSlug?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values;
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="@container space-y-4" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}
      <Field label="Product name" required error={fe.name} hint="Without the pack size, e.g. Basant Basmati Rice.">
        {(p) => <Input {...p} name="name" defaultValue={v?.name ?? initial.name} />}
      </Field>
      <div className="grid gap-4 @lg:grid-cols-2">
        <Field label="Category" required error={fe.category_id}>
          {(p) => (
            <Select {...p} name="category_id" defaultValue={v?.category_id ?? initial.category_id}>
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.active ? "" : " (hidden)"}</option>
              ))}
            </Select>
          )}
        </Field>
        {showSlug ? (
          <Field label="Web address" error={fe.slug} hint="Changing it breaks links already shared.">
            {(p) => <Input {...p} name="slug" defaultValue={v?.slug ?? initial.slug} />}
          </Field>
        ) : null}
      </div>
      <Field label="Description" error={fe.description} hint="Optional. Shown on the product page.">
        {(p) => <Textarea {...p} name="description" rows={3} defaultValue={v?.description ?? initial.description} />}
      </Field>
      <Checkbox name="active" defaultChecked={v ? v.active === "on" : initial.active} label="Visible in the catalogue" />
      <div>
        <SubmitButton block={false} pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
