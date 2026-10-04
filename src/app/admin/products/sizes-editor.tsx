"use client";
import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/validation/auth";

export interface SizeRow {
  id: string;
  size_label: string;
  supplier_id: string;
  cost: string;
  vat: string;
  sku: string;
  active: boolean;
}

const VAT = [
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "20", label: "20%" },
];

const control =
  "block h-10 w-full min-w-0 rounded-[var(--radius-sm)] border border-line-strong bg-raised px-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-danger";

/**
 * All sizes of one product, saved together. Fully controlled inputs, so a failed save keeps
 * what the admin typed. Cost is what we pay the supplier (ex VAT); it is admin-only.
 */
export function SizesEditor({
  action,
  initial,
  suppliers,
  defaultVat,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: SizeRow[];
  suppliers: { id: string; name: string }[];
  defaultVat: string;
}) {
  const blank = (existing: SizeRow[]): SizeRow => ({
    id: "",
    size_label: "",
    supplier_id: existing.find((r) => r.supplier_id)?.supplier_id ?? suppliers[0]?.id ?? "",
    cost: "",
    vat: defaultVat,
    sku: "",
    active: true,
  });
  const [state, formAction] = useActionState(action, {});
  const [rows, setRows] = useState<SizeRow[]>(initial.length ? initial : [blank(initial)]);
  // After a save the page re-renders with the stored rows (new sizes now have ids): take them.
  const signature = JSON.stringify(initial);
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setRows(initial.length ? initial : [blank(initial)]);
  }
  const fe = state.fieldErrors ?? {};
  const set = (i: number, patch: Partial<SizeRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const err = (i: number, f: string) => fe[`v.${i}.${f}`]?.[0];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}

      <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_76px_minmax(0,0.9fr)_64px] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted md:grid">
        <span>Size</span>
        <span>Supplier</span>
        <span>Cost (£, ex VAT)</span>
        <span>VAT</span>
        <span>SKU</span>
        <span>On sale</span>
      </div>

      <ul className="space-y-3 md:space-y-2">
        {rows.map((r, i) => (
          <li
            key={i}
            className={cn(
              "grid grid-cols-2 gap-2 rounded-[var(--radius-md)] border border-line p-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_76px_minmax(0,0.9fr)_64px] md:items-start md:border-0 md:p-1",
              !r.active && "opacity-60",
            )}
          >
            <input type="hidden" name={`v.${i}.id`} value={r.id} />
            <label className="col-span-2 md:col-span-1">
              <span className="mb-1 block text-xs font-medium text-ink-muted md:sr-only">Size</span>
              <input className={control} name={`v.${i}.size_label`} value={r.size_label} placeholder="e.g. 5 kg" aria-invalid={!!err(i, "size_label") || undefined} onChange={(e) => set(i, { size_label: e.target.value })} />
              {err(i, "size_label") ? <span className="mt-1 block text-xs font-medium text-danger">{err(i, "size_label")}</span> : null}
            </label>
            <label className="col-span-2 md:col-span-1">
              <span className="mb-1 block text-xs font-medium text-ink-muted md:sr-only">Supplier</span>
              <select className={control} name={`v.${i}.supplier_id`} value={r.supplier_id} onChange={(e) => set(i, { supplier_id: e.target.value })}>
                <option value="">No supplier yet</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-ink-muted md:sr-only">Cost (£, ex VAT)</span>
              <input className={cn(control, "tabular")} name={`v.${i}.cost`} value={r.cost} inputMode="decimal" placeholder="Needs price" aria-invalid={!!err(i, "cost") || undefined} onChange={(e) => set(i, { cost: e.target.value })} />
              {err(i, "cost") ? <span className="mt-1 block text-xs font-medium text-danger">{err(i, "cost")}</span> : null}
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-ink-muted md:sr-only">VAT</span>
              <select className={control} name={`v.${i}.vat`} value={r.vat} onChange={(e) => set(i, { vat: e.target.value })}>
                {(VAT.some((o) => o.value === r.vat) ? VAT : [...VAT, { value: r.vat, label: `${r.vat}%` }]).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-ink-muted md:sr-only">SKU</span>
              <input className={control} name={`v.${i}.sku`} value={r.sku} placeholder="Optional" onChange={(e) => set(i, { sku: e.target.value })} />
              {err(i, "sku") ? <span className="mt-1 block text-xs font-medium text-danger">{err(i, "sku")}</span> : null}
            </label>
            <label className="flex h-10 items-center gap-2 md:justify-center">
              <input type="checkbox" className="size-4 accent-[var(--brand-primary)]" name={`v.${i}.active`} checked={r.active} onChange={(e) => set(i, { active: e.target.checked })} />
              <span className="text-sm md:sr-only">On sale</span>
            </label>
            {!r.cost && r.size_label ? (
              <div className="col-span-2 md:col-span-6">
                <Badge tone="warning">Needs price: restaurants cannot order this size yet</Badge>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Button type="button" variant="secondary" size="sm" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setRows((rs) => [...rs, blank(rs)])} disabled={rows.length >= 40}>
          Add a size
        </Button>
        <SubmitButton block={false} pendingText="Saving…">Save sizes</SubmitButton>
      </div>
      <p className="text-xs text-ink-subtle">Sizes are never deleted, because past orders refer to them. Untick &ldquo;On sale&rdquo; to stop selling one.</p>
    </form>
  );
}
