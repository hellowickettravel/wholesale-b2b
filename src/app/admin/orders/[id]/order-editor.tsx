"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Money } from "@/components/ui/money";
import { orderProfit, rebuildOrder } from "@/domain/ledger";
import { formatBp, parsePounds, penceToInput } from "@/domain/money";
import type { DeliveryVatMode } from "@/domain/totals";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/validation/auth";

export interface EditorLine {
  id: string;
  productName: string;
  sizeLabel: string;
  qty: number;
  unitPricePence: number;
  unitCostPence: number | null;
  vatRateBp: number;
  supplierId: string;
}

interface Row {
  qty: string;
  supplierId: string;
  cost: string;
}

/**
 * Change quantities (0 takes a line off), move a line to another supplier with that supplier's
 * cost, and set the delivery charge. Sell prices stay as ordered. The preview uses the same
 * src/domain code as the server, which rebuilds everything again before saving.
 */
export function OrderEditor({
  action,
  lines,
  suppliers,
  delivery,
  expectedUpdatedAt,
  currentTotalPence,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  lines: EditorLine[];
  suppliers: { id: string; name: string; active: boolean }[];
  delivery: { chargePence: number; vatMode: DeliveryVatMode; fixedVatBp: number; minOrderPence: number; usualChargePence: number };
  expectedUpdatedAt: string;
  currentTotalPence: number;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const initial = () => Object.fromEntries(lines.map((l) => [l.id, { qty: String(l.qty), supplierId: l.supplierId, cost: l.unitCostPence === null ? "" : penceToInput(l.unitCostPence) }])) as Record<string, Row>;
  const [rows, setRows] = useState<Record<string, Row>>(initial);
  const [charge, setCharge] = useState(penceToInput(delivery.chargePence));
  const set = (id: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  const fe = state.fieldErrors ?? {};

  const preview = useMemo(() => {
    const chargePence = charge.trim() === "" ? 0 : parsePounds(charge);
    if (chargePence === null || chargePence < 0) return { error: "Check the delivery charge." };
    try {
      const built = rebuildOrder(
        lines.map((l) => {
          const r = rows[l.id];
          const cost = r.cost.trim() === "" ? null : parsePounds(r.cost);
          if (!/^\d{1,4}$/.test(r.qty.trim()) || (cost !== null && cost < 0) || (r.cost.trim() !== "" && cost === null)) throw new Error("bad");
          return { id: l.id, supplierId: r.supplierId, qty: Number(r.qty), unitPricePence: l.unitPricePence, unitCostPence: cost, vatRateBp: l.vatRateBp };
        }),
        { chargePence, vatMode: delivery.vatMode, fixedVatBp: delivery.fixedVatBp },
      );
      const t = built.totals;
      return { totals: t, profit: orderProfit({ goodsNetPence: t.goodsNetPence, deliveryNetPence: t.deliveryNetPence, costPence: t.costPence }) };
    } catch (e) {
      return { error: (e as Error).message === "an order needs at least one line" ? "Every line is at 0. To drop the whole order, cancel it instead." : "Check the quantities and costs: whole numbers 0–9999, costs like 4.20." };
    }
  }, [rows, charge, lines, delivery]);

  const goods = "totals" in preview && preview.totals ? preview.totals.goodsNetPence : null;
  const usual = goods !== null && goods < delivery.minOrderPence ? delivery.usualChargePence : 0;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <input type="hidden" name="expected_updated_at" value={expectedUpdatedAt} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="success">{state.notice}</Alert> : null}
      <div className="rounded-[var(--radius-md)] border border-line">
        <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_11rem_5.5rem_6.5rem_5rem] gap-3 border-b border-line bg-sunken px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted lg:grid">
          <span>Item</span><span>Supplier</span><span>Qty</span><span>Unit cost £</span><span className="text-right">Sell</span>
        </div>
        <ul className="divide-y divide-line">
          {lines.map((l) => {
            const r = rows[l.id];
            const off = r.qty.trim() === "0";
            const moved = r.supplierId !== l.supplierId;
            const small = "mb-1 block text-xs font-medium text-ink-muted lg:sr-only";
            return (
              <li key={l.id} className={cn("relative grid grid-cols-2 gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_6.5rem] lg:grid-cols-[minmax(0,1fr)_11rem_5.5rem_6.5rem_5rem] lg:items-center", off && "bg-danger-soft/40")}>
                <div className="col-span-2 sm:col-span-3 lg:col-span-1">
                  <span className={cn("font-medium text-ink", off && "line-through")}>{l.productName}</span>
                  <span className="block text-xs text-ink-muted">
                    {l.sizeLabel} · VAT {formatBp(l.vatRateBp)}
                    <span className="lg:hidden"> · sells at <Money pence={l.unitPricePence} /></span>
                    {off ? " · will be taken off" : ""}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className={small} htmlFor={`supplier.${l.id}`}>Supplier<span className="sr-only"> for {l.productName} {l.sizeLabel}</span></label>
                  <Select id={`supplier.${l.id}`} name={`supplier.${l.id}`} value={r.supplierId} onChange={(e) => set(l.id, { supplierId: e.target.value })} className="h-9 sm:h-9">
                    {suppliers.filter((s) => s.active || s.id === l.supplierId).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (off)"}</option>
                    ))}
                  </Select>
                  {moved ? <span className="mt-1 block text-xs text-warning">Moving: enter this supplier&apos;s cost</span> : null}
                </div>
                <div>
                  <label className={small} htmlFor={`qty.${l.id}`}>Quantity<span className="sr-only"> of {l.productName} {l.sizeLabel}</span></label>
                  <Input id={`qty.${l.id}`} name={`qty.${l.id}`} inputMode="numeric" value={r.qty} onChange={(e) => set(l.id, { qty: e.target.value })} aria-invalid={fe[`qty.${l.id}`] ? true : undefined} className="h-9 sm:h-9" />
                </div>
                <div>
                  <label className={small} htmlFor={`cost.${l.id}`}>Unit cost £<span className="sr-only"> of {l.productName} {l.sizeLabel}</span></label>
                  <Input id={`cost.${l.id}`} name={`cost.${l.id}`} inputMode="decimal" value={r.cost} placeholder="none" onChange={(e) => set(l.id, { cost: e.target.value })} aria-invalid={fe[`cost.${l.id}`] ? true : undefined} className="h-9 sm:h-9" />
                </div>
                <div className="hidden text-right lg:block"><Money pence={l.unitPricePence} /></div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,16rem)_1fr]">
        <div className="space-y-1.5">
          <label htmlFor="delivery_charge" className="block text-sm font-medium text-ink">Delivery charge (£, ex VAT)</label>
          <Input id="delivery_charge" name="delivery_charge" inputMode="decimal" value={charge} onChange={(e) => setCharge(e.target.value)} aria-invalid={fe.delivery_charge ? true : undefined} />
          <p className="text-[13px] text-ink-muted">
            Kept as ordered unless you change it. For goods of this size the usual charge is <Money pence={usual} />.
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-sunken p-3 text-sm" aria-live="polite">
          {"error" in preview && preview.error ? (
            <p className="text-danger">{preview.error}</p>
          ) : "totals" in preview && preview.totals ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              <dt className="text-ink-muted">Goods</dt><dd className="text-right"><Money pence={preview.totals.goodsNetPence} /></dd>
              <dt className="text-ink-muted">Delivery</dt><dd className="text-right"><Money pence={preview.totals.deliveryNetPence} /></dd>
              <dt className="text-ink-muted">VAT</dt><dd className="text-right"><Money pence={preview.totals.vatPence} /></dd>
              <dt className="font-semibold text-ink">New total</dt>
              <dd className="text-right font-semibold" data-testid="edit-new-total"><Money pence={preview.totals.totalPence} /></dd>
              <dt className="text-ink-muted">Was</dt><dd className="text-right"><Money pence={currentTotalPence} muted /></dd>
              <dt className="text-ink-muted">Profit (ex VAT)</dt>
              <dd className="text-right">{preview.profit === null ? <span className="text-ink-muted">cost missing</span> : <Money pence={preview.profit} />}</dd>
            </dl>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending} disabled={"error" in preview && Boolean(preview.error)}>Save changes</Button>
        <Button variant="ghost" onClick={() => { setRows(initial()); setCharge(penceToInput(delivery.chargePence)); }}>Reset</Button>
        <p className="text-[13px] text-ink-muted">Saving tells the suppliers involved and the restaurant.</p>
      </div>
    </form>
  );
}
