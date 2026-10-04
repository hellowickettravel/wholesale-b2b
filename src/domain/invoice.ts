/**
 * What an invoice shows: goods per VAT rate, the delivery line and the totals. Pure.
 * Totals come from the invoice snapshot (D13); the per-rate table is built from the order's lines
 * and is checked against that snapshot, so a PDF never shows figures that do not add up.
 */
import type { BasisPoints, Pence } from "./money";

export interface InvoiceLine {
  qty: number;
  unitPricePence: Pence;
  vatRateBp: BasisPoints;
  lineNetPence: Pence;
  lineVatPence: Pence;
}

export interface InvoiceTotals {
  goodsNetPence: Pence;
  goodsVatPence: Pence;
  deliveryNetPence: Pence;
  deliveryVatPence: Pence;
  vatPence: Pence;
  totalPence: Pence;
}

export interface VatRateRow {
  rateBp: BasisPoints;
  netPence: Pence;
  vatPence: Pence;
}

export interface InvoiceSummary {
  /** Goods by VAT rate, lowest rate first. */
  goodsByRate: VatRateRow[];
  totals: InvoiceTotals;
  /** True when the lines add up to the snapshot (they always should). */
  consistent: boolean;
}

export function invoiceSummary(lines: InvoiceLine[], totals: InvoiceTotals): InvoiceSummary {
  const byRate = new Map<BasisPoints, VatRateRow>();
  for (const l of lines) {
    const row = byRate.get(l.vatRateBp) ?? { rateBp: l.vatRateBp, netPence: 0, vatPence: 0 };
    row.netPence += l.lineNetPence;
    row.vatPence += l.lineVatPence;
    byRate.set(l.vatRateBp, row);
  }
  const goodsByRate = [...byRate.values()].sort((a, b) => a.rateBp - b.rateBp);
  const goodsNet = goodsByRate.reduce((a, r) => a + r.netPence, 0);
  const goodsVat = goodsByRate.reduce((a, r) => a + r.vatPence, 0);
  const consistent =
    lines.every((l) => l.lineNetPence === l.unitPricePence * l.qty) &&
    goodsNet === totals.goodsNetPence &&
    goodsVat === totals.goodsVatPence &&
    totals.vatPence === totals.goodsVatPence + totals.deliveryVatPence &&
    totals.totalPence === totals.goodsNetPence + totals.deliveryNetPence + totals.vatPence;
  return { goodsByRate, totals, consistent };
}

/** "INV-000012.pdf" */
export function invoiceFileName(number: number): string {
  return `INV-${String(number).padStart(6, "0")}.pdf`;
}
