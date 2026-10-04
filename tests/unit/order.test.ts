import { describe, expect, it } from "vitest";
import { fromIsoWeekdays } from "@/domain/dates";
import { buildOrder, type OrderLineInput } from "@/domain/order";
import { invoiceRef, orderRef } from "@/domain/status";
import type { DeliveryRules } from "@/domain/totals";
import { matchesWords } from "@/lib/catalogue/query";

const rules: DeliveryRules = { minOrderPence: 15000, deliveryChargePence: 1200, deliveryVatMode: "apportioned", deliveryFixedVatBp: 2000 };

function line(over: Partial<OrderLineInput>): OrderLineInput {
  return {
    variantId: "v",
    productId: "p",
    productName: "Item",
    sizeLabel: "1 kg",
    sku: null,
    qty: 1,
    unitPricePence: 1000,
    unitCostPence: 800,
    vatRateBp: 0,
    supplierId: "s1",
    ...over,
  };
}

describe("buildOrder", () => {
  // The seed's order 1001: 2 × rice @ £46.20 (0%, supplier A) + 3 × mango @ £17.00 (20%, supplier B).
  const order = buildOrder(
    [
      line({ variantId: "rice", qty: 2, unitPricePence: 4620, unitCostPence: 4200, supplierId: "A" }),
      line({ variantId: "mango", qty: 3, unitPricePence: 1700, unitCostPence: 1450, vatRateBp: 2000, supplierId: "B" }),
    ],
    rules,
  );

  it("totals match the hand-worked example (delivery charged, VAT apportioned)", () => {
    expect(order.totals).toMatchObject({
      goodsNetPence: 14340,
      goodsVatPence: 1020,
      deliveryNetPence: 1200,
      deliveryVatPence: 85,
      vatPence: 1105,
      totalPence: 16645,
      costPence: 12750,
      profitPence: 14340 + 1200 - 12750,
    });
  });

  it("splits by supplier and carries line net and VAT that add up to the order", () => {
    expect(order.supplierOrders.map((s) => s.supplierId)).toEqual(["A", "B"]);
    const all = order.supplierOrders.flatMap((s) => s.lines);
    expect(all.map((l) => [l.variantId, l.lineNetPence, l.lineVatPence])).toEqual([
      ["rice", 9240, 0],
      ["mango", 5100, 1020],
    ]);
    expect(all.reduce((a, l) => a + l.lineNetPence, 0)).toBe(order.totals.goodsNetPence);
    expect(all.reduce((a, l) => a + l.lineVatPence, 0)).toBe(order.totals.goodsVatPence);
  });

  it("keeps several lines of one supplier together in basket order", () => {
    const o = buildOrder([line({ variantId: "a", supplierId: "X" }), line({ variantId: "b", supplierId: "Y" }), line({ variantId: "c", supplierId: "X" })], rules);
    expect(o.supplierOrders.map((s) => [s.supplierId, s.lines.map((l) => l.variantId)])).toEqual([
      ["X", ["a", "c"]],
      ["Y", ["b"]],
    ]);
  });

  it("refuses empty orders, bad quantities and bad prices", () => {
    expect(() => buildOrder([], rules)).toThrow();
    expect(() => buildOrder([line({ qty: 0 })], rules)).toThrow();
    expect(() => buildOrder([line({ qty: 10000 })], rules)).toThrow();
    expect(() => buildOrder([line({ qty: 1.5 })], rules)).toThrow();
    expect(() => buildOrder([line({ unitPricePence: -1 })], rules)).toThrow();
    expect(() => buildOrder([line({ unitPricePence: 12.5 })], rules)).toThrow();
    expect(() => buildOrder([line({ supplierId: "" })], rules)).toThrow();
  });

  it("free delivery at the minimum; unknown cost leaves profit unknown", () => {
    const o = buildOrder([line({ qty: 15, unitCostPence: null })], rules);
    expect(o.totals.deliveryNetPence).toBe(0);
    expect(o.totals.totalPence).toBe(15000);
    expect(o.totals.profitPence).toBeNull();
  });
});

describe("helpers", () => {
  it("converts ISO weekdays (settings) to JS weekdays", () => {
    expect(fromIsoWeekdays([1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3, 4, 5, 6]);
    expect(fromIsoWeekdays([7, 1, 1, 0, 8])).toEqual([0, 1]);
  });
  it("formats order and invoice references", () => {
    expect(orderRef(1001)).toBe("ORDER-1001");
    expect(invoiceRef(1)).toBe("INV-000001");
    expect(invoiceRef(1234567)).toBe("INV-1234567");
  });
  it("matches every search word in any order, case-insensitively", () => {
    expect(matchesWords("Basant Basmati Rice", ["rice", "basant"])).toBe(true);
    expect(matchesWords("Basant Basmati Rice", ["rice", "sona"])).toBe(false);
    expect(matchesWords("Anything", [])).toBe(true);
  });
});
