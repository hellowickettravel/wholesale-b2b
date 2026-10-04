"use client";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { FormState } from "@/lib/validation/auth";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/**
 * What the admin can do next, by status. Approving asks which categories the restaurant should
 * see (all ticked by default) and optionally a default margin.
 */
export function StatusPanel({
  status,
  reason,
  action,
  categories,
  globalMargin,
}: {
  status: string;
  reason: string | null;
  action: Action;
  categories: { id: string; name: string }[];
  globalMargin: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [mode, setMode] = useState<"approve" | "reject" | null>(status === "pending" ? "approve" : null);
  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}
      {fe.action ? <Alert tone="danger">{fe.action[0]}</Alert> : null}

      {status === "pending" ? (
        <>
          <p className="text-sm text-ink-muted">This restaurant registered and cannot see prices or order until you approve it.</p>
          <div className="flex gap-2" role="tablist" aria-label="Decision">
            <Button size="sm" variant={mode === "approve" ? "primary" : "secondary"} onClick={() => setMode("approve")} aria-pressed={mode === "approve"}>Approve</Button>
            <Button size="sm" variant={mode === "reject" ? "danger" : "secondary"} onClick={() => setMode("reject")} aria-pressed={mode === "reject"}>Reject</Button>
          </div>
        </>
      ) : null}

      {(status === "pending" && mode === "approve") || status === "rejected" ? (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="action" value="approve" />
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">Categories they can see</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="categories" value={c.id} defaultChecked className="size-4 accent-[var(--brand-primary)]" />
                  {c.name}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-[13px] text-ink-muted">Fine-tune single products and prices on the Catalogue &amp; prices tab.</p>
          </fieldset>
          <Field label="Default margin (%)" error={fe.default_margin} hint={`Blank uses the global margin (${globalMargin}%).`}>
            {(p) => <Input {...p} name="default_margin" inputMode="decimal" placeholder={globalMargin} className="max-w-32" />}
          </Field>
          <Button type="submit" loading={pending}>{status === "rejected" ? "Approve after all" : "Approve account"}</Button>
        </form>
      ) : null}

      {status === "pending" && mode === "reject" ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="action" value="reject" />
          <Field label="Reason (the restaurant sees this)" required error={fe.reason}>
            {(p) => <Textarea {...p} name="reason" rows={3} placeholder="e.g. We only supply restaurants in Greater London at the moment." />}
          </Field>
          <Button type="submit" variant="danger" loading={pending}>Reject application</Button>
        </form>
      ) : null}

      {status === "approved" ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="action" value="suspend" />
          <p className="text-sm text-ink-muted">Approved: they can see their catalogue and order.</p>
          <Field label="Put on hold: reason (they see this)" error={fe.reason}>
            {(p) => <Textarea {...p} name="reason" rows={2} placeholder="e.g. Account on hold until the March invoices are paid." />}
          </Field>
          <Button type="submit" variant="secondary" loading={pending}>Put account on hold</Button>
        </form>
      ) : null}

      {status === "suspended" || status === "rejected" ? (
        <div className="space-y-3">
          {reason ? (
            <p className="rounded-[var(--radius-md)] bg-sunken px-3 py-2 text-sm text-ink-muted">
              <span className="font-medium text-ink">Reason shown to them:</span> {reason}
            </p>
          ) : null}
          {status === "suspended" ? (
            <form action={formAction}>
              <input type="hidden" name="action" value="reactivate" />
              <Button type="submit" loading={pending}>Reactivate account</Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
