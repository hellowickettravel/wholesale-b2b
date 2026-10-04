import { describe, expect, it } from "vitest";
import { invoiceFileName, invoiceSummary } from "@/domain/invoice";

// Seed order 1001: 2 × rice @ £46.20 (0%), 3 × mango @ £17.00 (20%), £12 delivery with 85p VAT.
const lines = [
  { qty: 2, unitPricePence: 4620, vatRateBp: 0, lineNetPence: 9240, lineVatPence: 0 },
  { qty: 3, unitPricePence: 1700, vatRateBp: 2000, lineNetPence: 5100, lineVatPence: 1020 },
];
const totals = { goodsNetPence: 14340, goodsVatPence: 1020, deliveryNetPence: 1200, deliveryVatPence: 85, vatPence: 1105, totalPence: 16645 };

describe("invoiceSummary", () => {
  it("groups goods by VAT rate, lowest first, and agrees with the snapshot", () => {
    const s = invoiceSummary([lines[1], lines[0]], totals);
    expect(s.goodsByRate).toEqual([
      { rateBp: 0, netPence: 9240, vatPence: 0 },
      { rateBp: 2000, netPence: 5100, vatPence: 1020 },
    ]);
    expect(s.consistent).toBe(true);
  });

  it("merges lines at the same rate", () => {
    const s = invoiceSummary([lines[1], { ...lines[1] }], { ...totals, goodsNetPence: 10200, goodsVatPence: 2040, vatPence: 2125, totalPence: 13525 });
    expect(s.goodsByRate).toEqual([{ rateBp: 2000, netPence: 10200, vatPence: 2040 }]);
    expect(s.consistent).toBe(true);
  });

  it("flags figures that do not add up", () => {
    expect(invoiceSummary(lines, { ...totals, totalPence: 16646 }).consistent).toBe(false);
    expect(invoiceSummary(lines, { ...totals, goodsNetPence: 1 }).consistent).toBe(false);
    expect(invoiceSummary([{ ...lines[0], lineNetPence: 9241 }], { ...totals }).consistent).toBe(false);
  });

  it("names the file after the gapless invoice number", () => {
    expect(invoiceFileName(12)).toBe("INV-000012.pdf");
  });
});
