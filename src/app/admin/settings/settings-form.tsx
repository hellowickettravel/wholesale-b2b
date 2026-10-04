"use client";
import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import type { FormState } from "@/lib/validation/auth";
import { saveSettings } from "./actions";

export type SettingsValues = Record<
  | "global_margin" | "min_order" | "delivery_charge" | "delivery_vat_mode" | "delivery_fixed_vat" | "business_legal_name" | "business_address"
  | "vat_number" | "bank_name" | "bank_account_name" | "bank_sort_code" | "bank_account_number" | "bank_iban" | "invoice_footer",
  string
> & { delivery_days: number[]; show_prices_inc_vat: boolean };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const isPlaceholder = (s: string) => /^\[.*\]$/.test(s.trim());

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveSettings, {});
  const fe = state.fieldErrors ?? {};
  const v = (k: Exclude<keyof SettingsValues, "delivery_days" | "show_prices_inc_vat">) => state.values?.[k] ?? initial[k];
  const hint = (k: Exclude<keyof SettingsValues, "delivery_days" | "show_prices_inc_vat">, text?: string) =>
    isPlaceholder(initial[k]) ? "Placeholder: fill in before the first invoice goes out." : text;

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}

      <Card>
        <CardHeader title="Prices" description="The margin used when a restaurant has no margin or fixed price of its own." />
        <CardBody className="@container grid gap-4 @lg:grid-cols-2">
          <Field label="Global margin (%)" required error={fe.global_margin} hint="Added to cost. 20 means a £10.00 cost sells at £12.00.">
            {(p) => <Input {...p} name="global_margin" inputMode="decimal" defaultValue={v("global_margin")} className="max-w-40" />}
          </Field>
          <div className="self-center">
            <Checkbox name="show_prices_inc_vat" defaultChecked={initial.show_prices_inc_vat} label="Show restaurants prices including VAT" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Delivery" />
        <CardBody className="@container space-y-4">
          <div className="grid gap-4 @lg:grid-cols-2">
            <Field label="Minimum order for free delivery (£)" required error={fe.min_order} hint="Goods total before VAT.">
              {(p) => <Input {...p} name="min_order" inputMode="decimal" defaultValue={v("min_order")} className="max-w-40" />}
            </Field>
            <Field label="Delivery charge below the minimum (£)" required error={fe.delivery_charge}>
              {(p) => <Input {...p} name="delivery_charge" inputMode="decimal" defaultValue={v("delivery_charge")} className="max-w-40" />}
            </Field>
            <Field label="VAT on the delivery charge" error={fe.delivery_vat_mode} hint="Ask the accountant (DECISIONS D5).">
              {(p) => (
                <Select {...p} name="delivery_vat_mode" defaultValue={v("delivery_vat_mode")}>
                  <option value="apportioned">Split across the basket&rsquo;s VAT rates</option>
                  <option value="fixed">One fixed rate</option>
                </Select>
              )}
            </Field>
            <Field label="Fixed delivery VAT rate (%)" error={fe.delivery_fixed_vat} hint="Used only with the fixed option.">
              {(p) => <Input {...p} name="delivery_fixed_vat" inputMode="decimal" defaultValue={v("delivery_fixed_vat")} className="max-w-40" />}
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">Delivery days</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d, i) => (
                <label key={d} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-line-strong bg-raised px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                  <input type="checkbox" name="delivery_days" value={i + 1} defaultChecked={initial.delivery_days.includes(i + 1)} className="size-4 accent-[var(--brand-primary)]" />
                  {d}
                </label>
              ))}
            </div>
            {fe.delivery_days ? <p className="mt-1.5 text-[13px] font-medium text-danger">{fe.delivery_days[0]}</p> : null}
          </fieldset>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Business and bank details" description="Printed on invoices and shown to restaurants after they order, so they can pay by bank transfer." />
        <CardBody className="@container space-y-4">
          <div className="grid gap-4 @lg:grid-cols-2">
            <Field label="Legal business name" required error={fe.business_legal_name} hint={hint("business_legal_name")}>
              {(p) => <Input {...p} name="business_legal_name" defaultValue={v("business_legal_name")} />}
            </Field>
            <Field label="VAT number" required error={fe.vat_number} hint={hint("vat_number")}>
              {(p) => <Input {...p} name="vat_number" defaultValue={v("vat_number")} />}
            </Field>
          </div>
          <Field label="Business address" required error={fe.business_address} hint={hint("business_address")}>
            {(p) => <Textarea {...p} name="business_address" rows={3} defaultValue={v("business_address")} />}
          </Field>
          <div className="grid gap-4 @lg:grid-cols-2">
            <Field label="Bank name" required error={fe.bank_name} hint={hint("bank_name")}>
              {(p) => <Input {...p} name="bank_name" defaultValue={v("bank_name")} />}
            </Field>
            <Field label="Account name" required error={fe.bank_account_name} hint={hint("bank_account_name")}>
              {(p) => <Input {...p} name="bank_account_name" defaultValue={v("bank_account_name")} />}
            </Field>
            <Field label="Sort code" required error={fe.bank_sort_code} hint={hint("bank_sort_code")}>
              {(p) => <Input {...p} name="bank_sort_code" defaultValue={v("bank_sort_code")} />}
            </Field>
            <Field label="Account number" required error={fe.bank_account_number} hint={hint("bank_account_number")}>
              {(p) => <Input {...p} name="bank_account_number" defaultValue={v("bank_account_number")} />}
            </Field>
            <Field label="IBAN" error={fe.bank_iban} hint="Optional.">
              {(p) => <Input {...p} name="bank_iban" defaultValue={v("bank_iban")} />}
            </Field>
          </div>
          <Field label="Invoice footer" required error={fe.invoice_footer} hint={hint("invoice_footer", "Payment terms and anything else printed at the bottom of every invoice.")}>
            {(p) => <Textarea {...p} name="invoice_footer" rows={3} defaultValue={v("invoice_footer")} />}
          </Field>
        </CardBody>
      </Card>

      <SubmitButton block={false} pendingText="Saving…">Save settings</SubmitButton>
    </form>
  );
}
