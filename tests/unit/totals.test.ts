import { describe, expect, it } from "vitest";
import { apportion, computeTotals, deliveryChargeFor, supplierOwed, type DeliveryRules } from "@/domain/totals";

const rules: DeliveryRules = {
  minOrderPence: 15000,
  deliveryChargePence: 1200,
  deliveryVatMode: "apportioned",
  deliveryFixedVatBp: 2000,
};

describe("delivery charge threshold", () => {
  it("charges below minimum, free at or above, none on empty basket", () => {
    expect(deliveryChargeFor(14999, rules)).toBe(1200);
    expect(deliveryChargeFor(15000, rules)).toBe(0);
    expect(deliveryChargeFor(20000, rules)).toBe(0);
    expect(deliveryChargeFor(0, rules)).toBe(0);
  });
});

describe("apportion", () => {
  it("always sums exactly", () => {
    for (const [amt, w] of [
      [1200, [1, 1, 1]],
      [1000, [3, 3, 3]],
      [1, [1, 1]],
      [1200, [7000, 3000]],
      [999, [1, 2, 3, 4]],
    ] as const) {
      const parts = apportion(amt, [...w]);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(amt);
    }
  });
  it("is proportional", () => {
    expect(apportion(1200, [7000, 3000])).toEqual([840, 360]);
    expect(apportion(1000, [1, 1, 1])).toEqual([334, 333, 333]);
  });
  it("handles zero weights", () => expect(apportion(100, [0, 0])).toEqual([0, 0]));
});

describe("computeTotals", () => {
  it("empty basket is all zero with no delivery", () => {
    const t = computeTotals([], rules);
    expect(t.totalPence).toBe(0);
    expect(t.deliveryCharged).toBe(false);
    expect(t.shortOfMinimumPence).toBe(0);
  });

  it("food only (0% VAT) under minimum: delivery added, delivery VAT 0 when apportioned", () => {
    const t = computeTotals([{ unitPricePence: 2300, qty: 2, vatRateBp: 0 }], rules);
    expect(t.goodsNetPence).toBe(4600);
    expect(t.goodsVatPence).toBe(0);
    expect(t.deliveryNetPence).toBe(1200);
    expect(t.deliveryVatPence).toBe(0);
    expect(t.totalPence).toBe(5800);
    expect(t.shortOfMinimumPence).toBe(10400);
  });

  it("mixed basket under minimum: delivery VAT apportioned by net value", () => {
    const t = computeTotals(
      [
        { unitPricePence: 3500, qty: 2, vatRateBp: 0 }, // 7000 food
        { unitPricePence: 1500, qty: 2, vatRateBp: 2000 }, // 3000 drinks, VAT 600
      ],
      rules,
    );
    expect(t.goodsNetPence).toBe(10000);
    expect(t.goodsVatPence).toBe(600);
    // delivery 1200 split 840 @0% / 360 @20% => VAT 72
    expect(t.deliveryVatPence).toBe(72);
    expect(t.vatBands).toEqual([
      { rateBp: 0, goodsNetPence: 7000, goodsVatPence: 0, deliveryNetPence: 840, deliveryVatPence: 0 },
      { rateBp: 2000, goodsNetPence: 3000, goodsVatPence: 600, deliveryNetPence: 360, deliveryVatPence: 72 },
    ]);
    expect(t.vatPence).toBe(672);
    expect(t.totalPence).toBe(10000 + 1200 + 672);
  });

  it("fixed delivery VAT mode uses one rate", () => {
    const t = computeTotals([{ unitPricePence: 1000, qty: 1, vatRateBp: 0 }], {
      ...rules,
      deliveryVatMode: "fixed",
    });
    expect(t.deliveryVatPence).toBe(240);
    expect(t.vatBands.find((b) => b.rateBp === 2000)?.deliveryNetPence).toBe(1200);
  });

  it("exactly at minimum: free delivery", () => {
    const t = computeTotals([{ unitPricePence: 5000, qty: 3, vatRateBp: 0 }], rules);
    expect(t.deliveryCharged).toBe(false);
    expect(t.totalPence).toBe(15000);
  });

  it("line-level VAT rounding (sum of rounded lines, not rounded sum)", () => {
    // each line 0.6p VAT -> 1p; three lines = 3p (invoice-level would be 1.8 -> 2p)
    const t = computeTotals(
      [
        { unitPricePence: 3, qty: 1, vatRateBp: 2000 },
        { unitPricePence: 3, qty: 1, vatRateBp: 2000 },
        { unitPricePence: 3, qty: 1, vatRateBp: 2000 },
      ],
      { ...rules, minOrderPence: 0 },
    );
    expect(t.goodsVatPence).toBe(3);
  });

  it("profit only when every cost is known", () => {
    const withCost = computeTotals(
      [
        { unitPricePence: 2300, qty: 10, vatRateBp: 0, unitCostPence: 2000 },
        { unitPricePence: 1200, qty: 5, vatRateBp: 2000, unitCostPence: 1000 },
      ],
      rules,
    );
    expect(withCost.costPence).toBe(25000);
    expect(withCost.profitPence).toBe(23000 + 6000 - 25000); // 4000, above min so no delivery
    const preview = computeTotals([{ unitPricePence: 2300, qty: 1, vatRateBp: 0 }], rules);
    expect(preview.profitPence).toBeNull();
  });

  it("profit includes delivery charge net", () => {
    const t = computeTotals([{ unitPricePence: 1000, qty: 1, vatRateBp: 0, unitCostPence: 800 }], rules);
    expect(t.profitPence).toBe(1000 + 1200 - 800);
  });

  it("rejects bad quantities", () => {
    expect(() => computeTotals([{ unitPricePence: 1, qty: -1, vatRateBp: 0 }], rules)).toThrow();
    expect(() => computeTotals([{ unitPricePence: 1, qty: 1.5, vatRateBp: 0 }], rules)).toThrow();
  });
});

describe("supplierOwed", () => {
  it("adds VAT on cost per line", () => {
    expect(
      supplierOwed([
        { qty: 10, vatRateBp: 0, unitCostPence: 2000 },
        { qty: 3, vatRateBp: 2000, unitCostPence: 333 },
      ]),
    ).toEqual({ netPence: 20999, vatPence: 200, grossPence: 21199 });
  });
  it("throws without cost", () => {
    expect(() => supplierOwed([{ qty: 1, vatRateBp: 0, unitCostPence: null }])).toThrow();
  });
});
