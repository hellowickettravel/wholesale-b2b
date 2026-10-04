/**
 * Admin ledger: rebuilding an order after an admin change, profit, what is owed to suppliers,
 * and chasing. Pure. Rules: DECISIONS.md D3 (rounding), D5 (delivery VAT), D6 (profit), D36.
 */
import { addDays, compareIso } from "./dates";
import { applyBp, type BasisPoints, type Pence } from "./money";
import { MAX_LINE_QTY } from "./order";
import type { OrderStatus } from "./status";
import { computeTotals, type DeliveryVatMode, type Totals } from "./totals";

export interface RebuildLine {
  id: string;
  supplierId: string;
  /** 0 = take the line off the order. */
  qty: number;
  unitPricePence: Pence;
  unitCostPence: Pence | null;
  vatRateBp: BasisPoints;
}

export interface RebuiltLine extends RebuildLine {
  lineNetPence: Pence;
  lineVatPence: Pence;
}

export interface DeliveryCharge {
  /** The charge (ex VAT) the admin keeps or sets; 0 = free delivery. */
  chargePence: Pence;
  vatMode: DeliveryVatMode;
  fixedVatBp: BasisPoints;
}

/**
 * Totals for an order the admin has changed. Unit prices stay as they were snapshotted; the
 * delivery charge is the one given (it is not re-derived from today's minimum order, so a change
 * never adds a charge the restaurant did not agree to); delivery VAT follows the new goods (D5).
 */
export function rebuildOrder(lines: RebuildLine[], delivery: DeliveryCharge): { totals: Totals; lines: RebuiltLine[] } {
  for (const l of lines) {
    if (!Number.isSafeInteger(l.qty) || l.qty < 0 || l.qty > MAX_LINE_QTY) throw new RangeError(`invalid qty ${l.qty}`);
    if (l.unitCostPence !== null && (!Number.isSafeInteger(l.unitCostPence) || l.unitCostPence < 0)) throw new RangeError("invalid cost");
  }
  if (!Number.isSafeInteger(delivery.chargePence) || delivery.chargePence < 0) throw new RangeError("invalid delivery charge");
  const live = lines.filter((l) => l.qty > 0);
  if (live.length === 0) throw new Error("an order needs at least one line");
  const totals = computeTotals(live, {
    // Forces exactly `chargePence`: below an unreachable minimum it always applies; at 0 never.
    minOrderPence: delivery.chargePence > 0 ? Number.MAX_SAFE_INTEGER : 0,
    deliveryChargePence: delivery.chargePence,
    deliveryVatMode: delivery.vatMode,
    deliveryFixedVatBp: delivery.fixedVatBp,
  });
  let i = 0;
  const out = lines.map((l) => {
    if (l.qty === 0) return { ...l, lineNetPence: 0, lineVatPence: 0 };
    const t = totals.lines[i++];
    return { ...l, lineNetPence: t.netPence, lineVatPence: t.vatPence };
  });
  return { totals, lines: out };
}

/** D6: goods net + delivery net − cost, ex VAT. Null when a line has no cost recorded. */
export function orderProfit(o: { goodsNetPence: Pence; deliveryNetPence: Pence; costPence: Pence | null; costMissing?: boolean }): Pence | null {
  if (o.costMissing || o.costPence === null) return null;
  return o.goodsNetPence + o.deliveryNetPence - o.costPence;
}

/**
 * Owed to a supplier for its lines (D6): cost × qty plus VAT on cost at each line's rate,
 * rounded per line. Lines without a cost are skipped and flagged.
 */
export function owedToSupplier(lines: { qty: number; vatRateBp: BasisPoints; unitCostPence: Pence | null }[]): {
  netPence: Pence;
  vatPence: Pence;
  grossPence: Pence;
  costMissing: boolean;
} {
  let netPence = 0;
  let vatPence = 0;
  let costMissing = false;
  for (const l of lines) {
    if (l.unitCostPence === null) {
      costMissing = true;
      continue;
    }
    const n = l.unitCostPence * l.qty;
    netPence += n;
    vatPence += applyBp(n, l.vatRateBp);
  }
  return { netPence, vatPence, grossPence: netPence + vatPence, costMissing };
}

export type SupplierPayState = "unpaid" | "part_paid" | "paid";

/** Paid when the admin ticked it, or payments cover what is owed. */
export function supplierPayState(owedGrossPence: Pence, paidPence: Pence, markedPaid: boolean): SupplierPayState {
  if (markedPaid || (owedGrossPence > 0 && paidPence >= owedGrossPence)) return "paid";
  return paidPence > 0 ? "part_paid" : "unpaid";
}

/** Days to the next chase after a reminder goes out. */
export const REMINDER_GAP_DAYS = 3;

export function nextChaseAfterReminder(today: string): string {
  return addDays(today, REMINDER_GAP_DAYS);
}

export interface ChaseInput {
  status: OrderStatus;
  balancePence: Pence;
  promisedPayDate: string | null;
  nextChaseDate: string | null;
}

/**
 * Chase today: money is still owed and the chase date has come. Overdue: still owed after the
 * date the restaurant promised. Cancelled orders and paid ones are never chased.
 */
export function chaseFlags(o: ChaseInput, today: string): { chaseDue: boolean; overdue: boolean } {
  const owed = o.status !== "cancelled" && o.balancePence > 0;
  return {
    chaseDue: owed && o.nextChaseDate !== null && compareIso(o.nextChaseDate, today) <= 0,
    overdue: owed && o.promisedPayDate !== null && compareIso(o.promisedPayDate, today) < 0,
  };
}
