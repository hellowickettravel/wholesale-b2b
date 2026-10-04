"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Ban, BellRing, CheckCircle2 } from "lucide-react";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { FormState } from "@/lib/validation/auth";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/validation/admin-orders";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

function Notice({ state }: { state: FormState }) {
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.notice) return <Alert tone="success">{state.notice}</Alert>;
  return null;
}

/** Amount, date, method, reference, note. `allowRefund` adds the refund tick (restaurant side). */
export function PaymentForm({ action, today, suggested, allowRefund, submitLabel }: { action: Action; today: string; suggested?: string; allowRefund?: boolean; submitLabel: string }) {
  const [state, formAction] = useActionState(action, {});
  const toast = useToast();
  // Confirm with a toast too: the section holding this form may fold away once a payment exists.
  useEffect(() => {
    if (state.notice) toast({ tone: "success", message: state.notice });
  }, [state, toast]);
  const fe = state.fieldErrors ?? {};
  const v = state.notice ? {} : (state.values ?? {});
  return (
    <form action={formAction} className="@container space-y-3" key={state.notice ?? "payment"}>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <div className="grid gap-3 @sm:grid-cols-2">
        <Field label="Amount (£)" error={fe.amount} required>
          {(p) => <Input {...p} name="amount" inputMode="decimal" autoComplete="off" defaultValue={v.amount ?? suggested ?? ""} placeholder="0.00" />}
        </Field>
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
          {(p) => <Input {...p} name="reference" autoComplete="off" maxLength={200} defaultValue={v.reference ?? ""} />}
        </Field>
      </div>
      <Field label="Note" error={fe.note}>
        {(p) => <Textarea {...p} name="note" rows={2} maxLength={2000} defaultValue={v.note ?? ""} />}
      </Field>
      {allowRefund ? <Checkbox name="refund" label="This is a refund to the restaurant" defaultChecked={v.refund === "on"} /> : null}
      <SubmitButton block={false} size="md" pendingText="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}

export function ChaseForm({ action, initial }: { action: Action; initial: { promised_pay_date: string; next_chase_date: string; payment_notes: string } }) {
  const [state, formAction] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? initial;
  return (
    <form action={formAction} className="@container space-y-3">
      <Notice state={state} />
      <div className="grid gap-3 @sm:grid-cols-2">
        <Field label="Promised to pay by" error={fe.promised_pay_date}>
          {(p) => <Input {...p} name="promised_pay_date" type="date" defaultValue={v.promised_pay_date} />}
        </Field>
        <Field label="Next chase" error={fe.next_chase_date} hint="Shows on the chase list from this date.">
          {(p) => <Input {...p} name="next_chase_date" type="date" defaultValue={v.next_chase_date} />}
        </Field>
      </div>
      <Field label="Payment notes" error={fe.payment_notes} hint="Only admins see these.">
        {(p) => <Textarea {...p} name="payment_notes" rows={3} maxLength={4000} defaultValue={v.payment_notes} />}
      </Field>
      <SubmitButton block={false} size="md" variant="secondary" pendingText="Saving…">Save</SubmitButton>
    </form>
  );
}

/** Small action button that runs a server action and shows its answer under it. */
export function ActionButton({
  action,
  children,
  icon,
  variant = "secondary",
  confirm,
}: {
  action: () => Promise<FormState>;
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({});
  const toast = useToast();
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant={variant}
        loading={pending}
        icon={icon}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const r = (await action()) ?? {};
            // Success shows as a toast: the button's row may leave the page once the action is done.
            if (r.notice) toast({ tone: "success", message: r.notice });
            setState({ error: r.error });
          });
        }}
      >
        {children}
      </Button>
      <Notice state={state} />
    </div>
  );
}

export function ReminderButton({ action }: { action: () => Promise<FormState> }) {
  return <ActionButton action={action} icon={<BellRing className="size-4" aria-hidden="true" />}>Send payment reminder</ActionButton>;
}

export function CompleteButton({ action, warning }: { action: () => Promise<FormState>; warning: string | null }) {
  return (
    <ActionButton
      action={action}
      variant="primary"
      icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
      confirm={warning ? `${warning} Mark the order completed anyway?` : undefined}
    >
      Mark completed
    </ActionButton>
  );
}

export function SupplierPaidToggle({ action, paid }: { action: (paid: boolean) => Promise<FormState>; paid: boolean }) {
  return (
    <ActionButton action={() => action(!paid)} confirm={paid ? "Mark this supplier as not paid?" : undefined}>
      {paid ? "Mark not paid" : "Mark paid"}
    </ActionButton>
  );
}

export function CancelOrder({ action, reference }: { action: Action; reference: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <>
      <Button variant="secondary" size="sm" icon={<Ban className="size-4" aria-hidden="true" />} onClick={() => setOpen(true)}>
        Cancel order
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Cancel ${reference}?`} description="Every supplier is told not to deliver, open driver links stop working and the invoice is voided. This cannot be undone.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await action({}, fd);
              if (r.notice) {
                // The page re-renders as cancelled and this button goes away: confirm with a toast.
                toast({ tone: "success", message: r.notice });
                setOpen(false);
              }
              setState(r.notice ? {} : r);
            });
          }}
        >
          {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
          <Field label="Reason" error={state.fieldErrors?.reason} hint="The restaurant sees this." required>
            {(p) => <Textarea {...p} name="reason" rows={2} maxLength={500} defaultValue={state.values?.reason ?? ""} />}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Keep order</Button>
            <Button type="submit" variant="danger" loading={pending}>Cancel order</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
