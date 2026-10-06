"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Money } from "@/components/ui/money";
import { useToast } from "@/components/ui/toast";
import type { FormState } from "@/lib/validation/auth";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/validation/admin-orders";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function SupplierForm({ action, initial, submitLabel }: { action: Action; initial: Record<string, string>; submitLabel: string }) {
  const [state, formAction] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? initial;
  return (
    <form action={formAction} className="@container space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}
      <Field label="Name" error={fe.name} required>
        {(p) => <Input {...p} name="name" maxLength={200} defaultValue={v.name ?? ""} />}
      </Field>
      <div className="grid gap-4 @lg:grid-cols-2">
        <Field label="Email for new orders" error={fe.email} hint="New orders and changes are emailed here.">
          {(p) => <Input {...p} name="email" type="email" maxLength={320} defaultValue={v.email ?? ""} />}
        </Field>
        <Field label="Phone" error={fe.phone}>
          {(p) => <Input {...p} name="phone" type="tel" maxLength={50} defaultValue={v.phone ?? ""} />}
        </Field>
      </div>
      <Field label="Address" error={fe.address}>
        {(p) => <Textarea {...p} name="address" rows={2} maxLength={500} defaultValue={v.address ?? ""} />}
      </Field>
      <Field label="Private notes" error={fe.notes} hint="Bank details, account numbers, contacts. Only admins see these.">
        {(p) => <Textarea {...p} name="notes" rows={3} maxLength={4000} defaultValue={v.notes ?? ""} />}
      </Field>
      <SubmitButton block={false} size="md" pendingText="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}

export interface UnpaidPart {
  id: string;
  orderId: string;
  label: string;
  customerName: string;
  delivered: boolean;
  leftPence: number;
  costMissing: boolean;
}

/** Tick the orders one bank transfer paid; the total updates as you tick. */
export function PayPartsForm({ action, parts, today }: { action: Action; parts: UnpaidPart[]; today: string }) {
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  const toast = useToast();
  const [picked, setPicked] = useState<Set<string>>(() => new Set(parts.filter((p) => p.delivered && !p.costMissing).map((p) => p.id)));
  const total = useMemo(() => parts.filter((p) => picked.has(p.id)).reduce((a, p) => a + p.leftPence, 0), [parts, picked]);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await action({}, fd);
          // Confirm with a toast: once the last order is paid this form leaves the page.
          if (r.notice) toast({ tone: "success", message: r.notice });
          setState(r.notice ? {} : r);
        });
      }}
    >
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
        {parts.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-sunken">
              <input
                type="checkbox"
                name="part"
                value={p.id}
                checked={picked.has(p.id)}
                disabled={p.costMissing}
                onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n; })}
                className="size-4 accent-[var(--brand-primary)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{p.label}</span>
                <span className="block text-[13px] text-ink-muted">{p.customerName}, {p.delivered ? "delivered" : "not delivered yet"}{p.costMissing ? ", a line has no cost" : ""}</span>
              </span>
              <Money pence={p.leftPence} className="font-semibold" />
            </label>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Date paid" error={fe.paid_on} required>
          {(p) => <Input {...p} name="paid_on" type="date" max={today} defaultValue={v.paid_on ?? today} />}
        </Field>
        <Field label="Method" error={fe.method}>
          {(p) => (
            <Select {...p} name="method" defaultValue={v.method ?? "bank_transfer"}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Reference" error={fe.reference}>
          {(p) => <Input {...p} name="reference" maxLength={200} defaultValue={v.reference ?? ""} />}
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>{pending ? "Recording…" : "Record payment and mark paid"}</Button>
        <span className="text-sm text-ink-muted">Selected: <Money pence={total} className="font-semibold text-ink" /></span>
      </div>
    </form>
  );
}
