import { describe, expect, it } from "vitest";
import { chaseFlags, nextChaseAfterReminder, orderProfit, owedToSupplier, rebuildOrder, supplierPayState, type RebuildLine } from "@/domain/ledger";
import { buildOrder } from "@/domain/order";
import { changedKeys, describeAuditRow, describeOrderEvent, type AuditEntry } from "@/lib/audit-format";

const line = (over: Partial<RebuildLine>): RebuildLine => ({ id: "l", supplierId: "A", qty: 1, unitPricePence: 1000, unitCostPence: 800, vatRateBp: 0, ...over });
const apportioned = { vatMode: "apportioned" as const, fixedVatBp: 2000 };

describe("rebuildOrder", () => {
  // Seed order 1001: 2 × rice @ £46.20 (0%) + 3 × mango @ £17.00 (20%), £12 delivery.
  const rice = line({ id: "rice", qty: 2, unitPricePence: 4620, unitCostPence: 4200, supplierId: "A" });
  const mango = line({ id: "mango", qty: 3, unitPricePence: 1700, unitCostPence: 1450, vatRateBp: 2000, supplierId: "B" });

  it("matches the totals the order was placed with when nothing changes", () => {
    const placed = buildOrder(
      [rice, mango].map((l) => ({ ...l, variantId: l.id, productId: l.id, productName: l.id, sizeLabel: "x", sku: null })),
      { minOrderPence: 15000, deliveryChargePence: 1200, deliveryVatMode: "apportioned", deliveryFixedVatBp: 2000 },
    ).totals;
    const again = rebuildOrder([rice, mango], { chargePence: 1200, ...apportioned }).totals;
    expect(again.totalPence).toBe(placed.totalPence);
    expect(again.vatPence).toBe(placed.vatPence);
    expect(again.totalPence).toBe(16645);
  });

  it("keeps the agreed delivery charge even when goods go over today's minimum", () => {
    const t = rebuildOrder([{ ...rice, qty: 10 }, mango], { chargePence: 1200, ...apportioned }).totals;
    expect(t.deliveryNetPence).toBe(1200);
    expect(t.goodsNetPence).toBe(46200 + 5100);
  });

  it("drops the charge when set to 0 and charges what is given otherwise", () => {
    expect(rebuildOrder([rice], { chargePence: 0, ...apportioned }).totals.deliveryNetPence).toBe(0);
    expect(rebuildOrder([rice], { chargePence: 500, ...apportioned }).totals.deliveryNetPence).toBe(500);
  });

  it("takes qty 0 lines off: zero line totals, not counted, order kept in place", () => {
    const r = rebuildOrder([rice, { ...mango, qty: 0 }], { chargePence: 1200, ...apportioned });
    expect(r.lines.map((l) => [l.id, l.lineNetPence, l.lineVatPence])).toEqual([["rice", 9240, 0], ["mango", 0, 0]]);
    expect(r.totals.goodsVatPence).toBe(0);
    // Delivery VAT follows the remaining goods (all 0%).
    expect(r.totals.deliveryVatPence).toBe(0);
    expect(r.totals.totalPence).toBe(9240 + 1200);
  });

  it("moving a line to another supplier with its own cost changes profit, not the price", () => {
    const before = rebuildOrder([rice, mango], { chargePence: 1200, ...apportioned }).totals;
    const after = rebuildOrder([rice, { ...mango, supplierId: "C", unitCostPence: 1300 }], { chargePence: 1200, ...apportioned }).totals;
    expect(after.totalPence).toBe(before.totalPence);
    expect(after.profitPence! - before.profitPence!).toBe(3 * 150);
  });

  it("refuses an empty order and bad numbers", () => {
    expect(() => rebuildOrder([{ ...rice, qty: 0 }], { chargePence: 0, ...apportioned })).toThrow("at least one line");
    expect(() => rebuildOrder([{ ...rice, qty: 10000 }], { chargePence: 0, ...apportioned })).toThrow(RangeError);
    expect(() => rebuildOrder([{ ...rice, qty: 1.5 }], { chargePence: 0, ...apportioned })).toThrow(RangeError);
    expect(() => rebuildOrder([{ ...rice, unitCostPence: -1 }], { chargePence: 0, ...apportioned })).toThrow(RangeError);
    expect(() => rebuildOrder([rice], { chargePence: -5, ...apportioned })).toThrow(RangeError);
  });

  it("a missing cost leaves profit unknown", () => {
    expect(rebuildOrder([{ ...rice, unitCostPence: null }], { chargePence: 0, ...apportioned }).totals.profitPence).toBeNull();
  });
});

describe("orderProfit (D6)", () => {
  it("is goods net + delivery net − cost, ex VAT", () => {
    expect(orderProfit({ goodsNetPence: 14340, deliveryNetPence: 1200, costPence: 12750 })).toBe(2790);
  });
  it("is null when any cost is missing", () => {
    expect(orderProfit({ goodsNetPence: 100, deliveryNetPence: 0, costPence: 50, costMissing: true })).toBeNull();
    expect(orderProfit({ goodsNetPence: 100, deliveryNetPence: 0, costPence: null })).toBeNull();
  });
});

describe("owedToSupplier", () => {
  it("adds VAT on cost per line, rounded per line", () => {
    // 3 × £14.50 at 20% = £43.50 + £8.70; 1 × £0.33 at 20% = 6.6p -> 7p.
    expect(owedToSupplier([
      { qty: 3, vatRateBp: 2000, unitCostPence: 1450 },
      { qty: 1, vatRateBp: 2000, unitCostPence: 33 },
    ])).toEqual({ netPence: 4383, vatPence: 877, grossPence: 5260, costMissing: false });
  });
  it("skips and flags lines with no cost", () => {
    expect(owedToSupplier([{ qty: 2, vatRateBp: 0, unitCostPence: 4200 }, { qty: 1, vatRateBp: 0, unitCostPence: null }])).toEqual({ netPence: 8400, vatPence: 0, grossPence: 8400, costMissing: true });
  });
});

describe("supplierPayState", () => {
  it("is paid when ticked, or when payments cover what is owed", () => {
    expect(supplierPayState(1000, 0, true)).toBe("paid");
    expect(supplierPayState(1000, 1000, false)).toBe("paid");
    expect(supplierPayState(1000, 400, false)).toBe("part_paid");
    expect(supplierPayState(1000, 0, false)).toBe("unpaid");
    expect(supplierPayState(0, 0, false)).toBe("unpaid");
  });
});

describe("chasing", () => {
  const today = "2026-10-06";
  it("chase today when owed and the chase date has come", () => {
    expect(chaseFlags({ status: "sent", balancePence: 100, promisedPayDate: null, nextChaseDate: today }, today).chaseDue).toBe(true);
    expect(chaseFlags({ status: "sent", balancePence: 100, promisedPayDate: null, nextChaseDate: "2026-10-01" }, today).chaseDue).toBe(true);
    expect(chaseFlags({ status: "sent", balancePence: 100, promisedPayDate: null, nextChaseDate: "2026-10-07" }, today).chaseDue).toBe(false);
  });
  it("overdue only after the promised day", () => {
    expect(chaseFlags({ status: "delivered", balancePence: 100, promisedPayDate: today, nextChaseDate: null }, today).overdue).toBe(false);
    expect(chaseFlags({ status: "delivered", balancePence: 100, promisedPayDate: "2026-10-05", nextChaseDate: null }, today).overdue).toBe(true);
  });
  it("never chases paid or cancelled orders", () => {
    expect(chaseFlags({ status: "delivered", balancePence: 0, promisedPayDate: "2026-10-01", nextChaseDate: "2026-10-01" }, today)).toEqual({ chaseDue: false, overdue: false });
    expect(chaseFlags({ status: "cancelled", balancePence: 500, promisedPayDate: "2026-10-01", nextChaseDate: "2026-10-01" }, today)).toEqual({ chaseDue: false, overdue: false });
  });
  it("a reminder moves the next chase on three days", () => {
    expect(nextChaseAfterReminder("2026-10-30")).toBe("2026-11-02");
  });
});

describe("audit wording", () => {
  const e = (over: Partial<AuditEntry>): AuditEntry => ({ id: 1, at: "2026-10-04T10:00:00Z", actor_id: null, action: "update", entity: "orders", entity_id: "x", before: null, after: null, ...over });
  const names = { supplier: (id: string) => ({ A: "Shrivi", B: "Foodlords" })[id] ?? "?" };

  it("describes order changes in plain words", () => {
    expect(describeOrderEvent(e({ action: "insert", after: { total_pence: 16645 } }), names)).toBe("Order placed: £166.45");
    expect(describeOrderEvent(e({ before: { status: "placed", total_pence: 1 }, after: { status: "sent", total_pence: 1 } }), names)).toBe("Status: Placed → Sent to supplier");
    expect(describeOrderEvent(e({ before: { status: "placed" }, after: { status: "cancelled", cancel_reason: "Closed for refit" } }), names)).toBe("Order cancelled: Closed for refit");
  });
  it("describes line changes, moves and removals", () => {
    const item = { product_name: "Mango Drink", size_label: "330 ml × 24", qty: 3, supplier_id: "B", unit_cost_pence: 1450, removed_at: null };
    expect(describeOrderEvent(e({ entity: "order_items", before: item, after: { ...item, qty: 5 } }), names)).toBe("Mango Drink 330 ml × 24: quantity 3 → 5");
    expect(describeOrderEvent(e({ entity: "order_items", before: item, after: { ...item, supplier_id: "A", unit_cost_pence: 1300 } }), names)).toBe("Mango Drink 330 ml × 24 moved from Foodlords to Shrivi · Mango Drink 330 ml × 24: cost £14.50 → £13.00");
    expect(describeOrderEvent(e({ entity: "order_items", before: item, after: { ...item, removed_at: "2026-10-04" } }), names)).toBe("Mango Drink 330 ml × 24 taken off the order");
    expect(describeOrderEvent(e({ entity: "order_items", action: "insert", after: item }), names)).toBeNull();
  });
  it("describes payments, refunds and proofs", () => {
    expect(describeOrderEvent(e({ entity: "customer_payments", action: "insert", after: { amount_pence: 5000, method: "bank_transfer", reference: "ORDER-1001", paid_on: "2026-10-04" } }), names)).toBe("Payment received £50.00 (bank transfer, ref ORDER-1001) on 4 Oct");
    expect(describeOrderEvent(e({ entity: "customer_payments", action: "insert", after: { amount_pence: -500, method: "cash", paid_on: "2026-10-04" } }), names)).toBe("Refund £5.00 (cash) on 4 Oct");
    expect(describeOrderEvent(e({ entity: "supplier_payments", action: "insert", after: { amount_pence: 8400, supplier_id: "A", paid_on: "2026-10-04" } }), names)).toBe("Paid Shrivi £84.00 on 4 Oct");
    expect(describeOrderEvent(e({ entity: "delivery_proofs", before: { submitted_at: null }, after: { submitted_at: "x", submitted_by_kind: "driver" } }), names)).toBe("Proof of delivery from the driver");
  });
  it("lists changed keys for the audit screen", () => {
    expect(changedKeys({ a: 1, b: 2, updated_at: 1 }, { a: 1, b: 3, updated_at: 2, c: null })).toEqual(["b"]);
    expect(describeAuditRow(e({ entity: "product_variants", before: { cost_pence: 1 }, after: { cost_pence: 2 } }), "Product sizes and costs")).toBe("Changed product sizes and costs: cost_pence");
  });
});
