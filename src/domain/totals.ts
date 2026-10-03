/**
 * Basket / order / invoice totals. Used by the basket preview in the browser AND by
 * server-side order creation (the server always recomputes; never trusts client totals).
 * Rules: DECISIONS.md D3 (rounding), D5 (delivery VAT), D6 (profit).
 */
import { applyBp, roundDiv, type BasisPoints, type Pence } from "./money";

export interface TotalsLine {
  unitPricePence: Pence;
  qty: number;
  vatRateBp: BasisPoints;
  /** Only known server-side / admin. Omit in customer previews. */
  unitCostPence?: Pence | null;
}

export type DeliveryVatMode = "apportioned" | "fixed";

export interface DeliveryRules {
  minOrderPence: Pence;
  deliveryChargePence: Pence;
  deliveryVatMode: DeliveryVatMode;
  /** Used when mode is "fixed". */
  deliveryFixedVatBp: BasisPoints;
}

export interface VatBand {
  rateBp: BasisPoints;
  goodsNetPence: Pence;
  goodsVatPence: Pence;
  deliveryNetPence: Pence;
  deliveryVatPence: Pence;
}

export interface LineTotals {
  netPence: Pence;
  vatPence: Pence;
  grossPence: Pence;
}

export interface Totals {
  lines: LineTotals[];
  goodsNetPence: Pence;
  goodsVatPence: Pence;
  deliveryNetPence: Pence;
  deliveryVatPence: Pence;
  vatPence: Pence;
  netPence: Pence;
  totalPence: Pence;
  vatBands: VatBand[];
  /** Amount still needed to reach free delivery; 0 when met or basket empty. */
  shortOfMinimumPence: Pence;
  deliveryCharged: boolean;
  /** Null when any line lacks a cost (e.g. customer preview). */
  costPence: Pence | null;
  /** Ex VAT: goods net + delivery net - cost. Null when cost unknown. */
  profitPence: Pence | null;
}

function assertQty(qty: number): void {
  if (!Number.isSafeInteger(qty) || qty < 0) throw new RangeError(`invalid qty ${qty}`);
}

export function lineTotals(line: TotalsLine): LineTotals {
  assertQty(line.qty);
  const netPence = line.unitPricePence * line.qty;
  const vatPence = applyBp(netPence, line.vatRateBp);
  return { netPence, vatPence, grossPence: netPence + vatPence };
}

/**
 * Split `amount` across weights with the largest-remainder method so the parts
 * always sum exactly to `amount`. Ties go to the earlier index (stable).
 */
export function apportion(amount: Pence, weights: number[]): Pence[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => {
    const exact = amount * w;
    const base = Math.floor(exact / total);
    return { base, rem: exact - base * total };
  });
  let left = amount - raw.reduce((a, r) => a + r.base, 0);
  const order = raw
    .map((r, i) => ({ i, rem: r.rem }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  const out = raw.map((r) => r.base);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k].i] += 1;
  return out;
}

export function deliveryChargeFor(goodsNetPence: Pence, rules: DeliveryRules): Pence {
  if (goodsNetPence <= 0) return 0;
  return goodsNetPence < rules.minOrderPence ? rules.deliveryChargePence : 0;
}

export function computeTotals(lines: TotalsLine[], rules: DeliveryRules): Totals {
  const lt = lines.map(lineTotals);

  const bandMap = new Map<BasisPoints, VatBand>();
  const band = (rateBp: BasisPoints): VatBand => {
    let b = bandMap.get(rateBp);
    if (!b) {
      b = { rateBp, goodsNetPence: 0, goodsVatPence: 0, deliveryNetPence: 0, deliveryVatPence: 0 };
      bandMap.set(rateBp, b);
    }
    return b;
  };
  lines.forEach((l, i) => {
    if (l.qty === 0) return;
    const b = band(l.vatRateBp);
    b.goodsNetPence += lt[i].netPence;
    b.goodsVatPence += lt[i].vatPence;
  });

  const goodsNetPence = lt.reduce((a, l) => a + l.netPence, 0);
  const goodsVatPence = lt.reduce((a, l) => a + l.vatPence, 0);
  const deliveryNetPence = deliveryChargeFor(goodsNetPence, rules);

  if (deliveryNetPence > 0) {
    if (rules.deliveryVatMode === "fixed") {
      const b = band(rules.deliveryFixedVatBp);
      b.deliveryNetPence = deliveryNetPence;
      b.deliveryVatPence = applyBp(deliveryNetPence, rules.deliveryFixedVatBp);
    } else {
      const goodsBands = [...bandMap.values()].sort((a, b) => a.rateBp - b.rateBp);
      const parts = apportion(
        deliveryNetPence,
        goodsBands.map((b) => b.goodsNetPence),
      );
      goodsBands.forEach((b, i) => {
        b.deliveryNetPence = parts[i];
        b.deliveryVatPence = applyBp(parts[i], b.rateBp);
      });
    }
  }

  const vatBands = [...bandMap.values()].sort((a, b) => a.rateBp - b.rateBp);
  const deliveryVatPence = vatBands.reduce((a, b) => a + b.deliveryVatPence, 0);
  const vatPence = goodsVatPence + deliveryVatPence;
  const netPence = goodsNetPence + deliveryNetPence;

  const costKnown = lines.every((l) => l.unitCostPence !== undefined && l.unitCostPence !== null);
  const costPence = costKnown
    ? lines.reduce((a, l) => a + (l.unitCostPence as number) * l.qty, 0)
    : null;

  return {
    lines: lt,
    goodsNetPence,
    goodsVatPence,
    deliveryNetPence,
    deliveryVatPence,
    vatPence,
    netPence,
    totalPence: netPence + vatPence,
    vatBands,
    shortOfMinimumPence:
      goodsNetPence > 0 ? Math.max(0, rules.minOrderPence - goodsNetPence) : 0,
    deliveryCharged: deliveryNetPence > 0,
    costPence,
    profitPence: costPence === null ? null : netPence - costPence,
  };
}

/** What the client owes a supplier for a set of lines: cost net + VAT on cost per line. */
export function supplierOwed(lines: Pick<TotalsLine, "qty" | "vatRateBp" | "unitCostPence">[]): {
  netPence: Pence;
  vatPence: Pence;
  grossPence: Pence;
} {
  let netPence = 0;
  let vatPence = 0;
  for (const l of lines) {
    assertQty(l.qty);
    if (l.unitCostPence === null || l.unitCostPence === undefined) {
      throw new Error("supplierOwed requires unit cost on every line");
    }
    const n = l.unitCostPence * l.qty;
    netPence += n;
    vatPence += applyBp(n, l.vatRateBp);
  }
  return { netPence, vatPence, grossPence: netPence + vatPence };
}

/** Margin of a total as bp of revenue, for dashboards. */
export function marginOnRevenueBp(profitPence: Pence, netPence: Pence): BasisPoints | null {
  return netPence === 0 ? null : roundDiv(profitPence * 10_000, netPence);
}
