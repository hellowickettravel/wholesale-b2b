"use client";
import { useActionState, useState } from "react";
import { Building2, ShieldCheck, Truck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/auth/submit-button";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/validation/auth";
import { inviteUser } from "./actions";

const ROLES = [
  { value: "customer", label: "Restaurant", hint: "Approved straight away", icon: Building2 },
  { value: "supplier", label: "Supplier", hint: "Sees only their orders", icon: Truck },
  { value: "admin", label: "Admin", hint: "Full access", icon: ShieldCheck },
] as const;

export function InviteForm({ suppliers }: { suppliers: { id: string; name: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(inviteUser, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const [role, setRole] = useState<string>(v.role ?? "customer");

  return (
    <form action={action} className="space-y-5" noValidate key={state.notice ?? "form"}>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="success">{state.notice} They will get an email with a link to set their password.</Alert> : null}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Account type</legend>
        <div className="grid gap-2 sm:grid-cols-3 lg:max-w-3xl">
          {ROLES.map(({ value, label, hint, icon: Icon }) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border bg-raised p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30",
                role === value ? "border-primary bg-primary-soft/50" : "border-line-strong hover:border-ink-subtle",
              )}
            >
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
              <Icon className={cn("mt-0.5 size-5 shrink-0", role === value ? "text-primary" : "text-ink-muted")} aria-hidden="true" />
              <span>
                <span className="block text-sm font-semibold text-ink">{label}</span>
                <span className="block text-xs text-ink-muted">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
        <Field label="Full name" required error={fe.full_name}>
          {(p) => <Input {...p} name="full_name" autoComplete="off" defaultValue={v.full_name} />}
        </Field>
        <Field label="Email" required error={fe.email}>
          {(p) => <Input {...p} name="email" type="email" autoComplete="off" defaultValue={v.email} />}
        </Field>
      </div>

      {role === "customer" ? (
        <Field className="lg:max-w-3xl" label="Restaurant or business name" required error={fe.business_name} hint="Pricing and catalogue are set on the customer's page.">
          {(p) => <Input {...p} name="business_name" defaultValue={v.business_name} />}
        </Field>
      ) : null}

      {role === "supplier" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
          <Field label="Existing supplier" error={fe.supplier_id}>
            {(p) => (
              <Select {...p} name="supplier_id" defaultValue={v.supplier_id ?? ""}>
                <option value="">New supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Or new supplier name" error={fe.new_supplier_name} hint="Used when no existing supplier is chosen.">
            {(p) => <Input {...p} name="new_supplier_name" defaultValue={v.new_supplier_name} />}
          </Field>
        </div>
      ) : null}

      <div className="lg:max-w-3xl">
        <SubmitButton block={false} pendingText="Sending invite…">Send invitation</SubmitButton>
      </div>
    </form>
  );
}
