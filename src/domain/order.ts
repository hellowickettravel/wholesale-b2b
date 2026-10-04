/**
 * Turn priced basket lines into an order: totals (D3, D5) and one supplier order per supplier.
 * Pure. The server calls it with lines it has priced itself; the result is what create_order_tx
 * stores, so the order, its supplier orders and its invoice always agree.
 */
import type { BasisPoints, Pence } from "./money";
import { splitBySupplier } from "./split";
import { computeTotals, type DeliveryRules, type Totals } from "./totals";

export interface OrderLineInput {
  variantId: string;
  productId: string;
  productName: string;
  sizeLabel: string;
  sku: string | null;
  qty: number;
  unitPricePence: Pence;
  unitCostPence: Pence | null;
  vatRateBp: BasisPoints;
  supplierId: string;
}

export interface OrderLine extends OrderLineInput {
  lineNetPence: Pence;
  lineVatPence: Pence;
}

export interface BuiltOrder {
  totals: Totals;
  supplierOrders: { supplierId: string; lines: OrderLine[] }[];
}

export const MAX_LINE_QTY = 9999;

export function buildOrder(lines: OrderLineInput[], rules: DeliveryRules): BuiltOrder {
  if (lines.length === 0) throw new Error("order has no lines");
  for (const l of lines) {
    if (!Number.isSafeInteger(l.qty) || l.qty < 1 || l.qty > MAX_LINE_QTY) throw new RangeError(`invalid qty ${l.qty}`);
    if (!Number.isSafeInteger(l.unitPricePence) || l.unitPricePence < 0) throw new RangeError("invalid price");
  }
  const totals = computeTotals(lines, rules);
  const withTotals: OrderLine[] = lines.map((l, i) => ({
    ...l,
    lineNetPence: totals.lines[i].netPence,
    lineVatPence: totals.lines[i].vatPence,
  }));
  return { totals, supplierOrders: splitBySupplier(withTotals) };
}
