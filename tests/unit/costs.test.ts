import { describe, expect, it } from "vitest";
import { parseCost, planCosts, readCostCsv, type CostVariant } from "@/lib/import/costs";

const v = (id: string, product: string, size: string, over: Partial<CostVariant> = {}): CostVariant => ({
  id,
  productName: product,
  categoryName: "Rice",
  sizeLabel: size,
  sku: null,
  sourceRef: null,
  costPence: null,
  vatBp: 0,
  supplierId: null,
  supplierName: null,
  ...over,
});
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("parseCost", () => {
  it("reads prices the way people type them", () => {
    expect(parseCost("12.5")).toBe(1250);
    expect(parseCost("£1,234.56")).toBe(123456);
    expect(parseCost(" £ 9 ")).toBe(900);
    expect(parseCost("12,50")).toBe(1250);
    expect(parseCost("abc")).toBeNull();
    expect(parseCost("1.234")).toBeNull();
  });
});

describe("readCostCsv", () => {
  it("needs a cost column and a way to find the size", () => {
    expect(readCostCsv("product,size\nRice,5 kg").errors[0].message).toMatch(/cost/);
    expect(readCostCsv("cost\n5").errors[0].message).toMatch(/variant_id|sku|product/);
  });
  it("skips blank costs, reports bad ones and reads the rest", () => {
    const r = readCostCsv(`variant_id,product,size,cost,vat\n${A},Rice,5 kg,£20.00,\n${B},Rice,20 kg,,\n${C},Rice,1 kg,free,\nnot-an-id,Rice,2 kg,3,\n${A},Rice,5 kg,0,\n`);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ variantId: A, costPence: 2000 });
    expect(r.blank).toBe(1);
    expect(r.errors.map((e) => e.line)).toEqual([4, 5, 6]);
  });
  it("reads vat and rejects a nonsense rate", () => {
    const ok = readCostCsv(`sku,cost,vat\nX1,5,20\n`);
    expect(ok.rows[0].vatBp).toBe(2000);
    expect(readCostCsv(`sku,cost,vat\nX1,5,250\n`).errors).toHaveLength(1);
  });
});

describe("planCosts", () => {
  const variants = [
    v(A, "Basant Basmati Rice", "20 kg", { sku: "BAS20", sourceRef: "BASANT BASMATI RICE 20 KGS", costPence: 4000 }),
    v(B, "Basant Basmati Rice", "5 kg", { sourceRef: "BASANT BASMATI RICE 5 KG" }),
    v(C, "Mango Drink", "330 ml × 24", { categoryName: "Drinks", costPence: 1450, vatBp: 2000, supplierId: "s1", supplierName: "One" }),
  ];
  const suppliers = [{ id: "s1", name: "One" }, { id: "s2", name: "Two" }];
  const plan = (csv: string) => planCosts(readCostCsv(csv).rows, variants, suppliers);

  it("matches by variant_id, sku, supplier item text, and name + size", () => {
    const p = plan(`variant_id,sku,product,size,cost\n${A},,,,41\n,,BASANT BASMATI RICE 5 KG,,22\n,,Mango Drink,330ml x 24,15\n`);
    expect(p.changes.map((c) => [c.id, c.newCostPence])).toEqual([[A, 4100], [B, 2200], [C, 1500]]);
    const bySku = plan(`sku,cost\nbas20,40.00\n`);
    expect(bySku.unchanged).toBe(1);
    expect(bySku.changes).toHaveLength(0);
  });
  it("reports what it could not match instead of guessing", () => {
    const p = plan(`product,size,cost\nBasant Basmati Rice,10 kg,30\nNo Such Thing,1 kg,2\n`);
    expect(p.changes).toHaveLength(0);
    expect(p.notFound).toHaveLength(2);
  });
  it("flags a large change and a repeated size, and takes a vat or supplier change from the file", () => {
    const p = plan(`variant_id,cost,vat,supplier\n${A},90,,\n${C},15,5,Two\n${C},16,5,Two\n`);
    expect(p.changes.find((c) => c.id === A)?.big).toBe(true);
    const c = p.changes.find((x) => x.id === C)!;
    expect(c).toMatchObject({ newCostPence: 1600, vatBp: 500, oldVatBp: 2000, supplierId: "s2" });
    expect(p.repeated).toHaveLength(1);
  });
  it("rejects an unknown supplier name", () => {
    const p = plan(`variant_id,cost,supplier\n${A},50,Nobody\n`);
    expect(p.unknownSupplier).toHaveLength(1);
    expect(p.changes).toHaveLength(0);
  });
});
