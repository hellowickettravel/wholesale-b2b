import { describe, expect, it } from "vitest";
import { marginFromPrice, resolvePrice, sellFromCost, type PricingRules } from "@/domain/pricing";

const base: PricingRules = {
  globalMarginBp: 1500,
  customerDefaultMarginBp: null,
  categoryMarginsBp: {},
  overridesPence: {},
};
const variant = { variantId: "v1", categoryId: "rice", costPence: 2000 };

describe("sellFromCost", () => {
  it("applies margin on cost with half-up rounding", () => {
    expect(sellFromCost(2000, 1500)).toBe(2300);
    expect(sellFromCost(999, 1250)).toBe(1124); // 1123.875 -> 1124
    expect(sellFromCost(333, 1000)).toBe(366); // 366.3 -> 366
    expect(sellFromCost(5, 1000)).toBe(6); // 5.5 -> 6
  });
  it("allows negative margins but floors at zero", () => {
    expect(sellFromCost(2000, -1000)).toBe(1800);
    expect(sellFromCost(2000, -20000)).toBe(0);
  });
});

describe("resolvePrice precedence", () => {
  it("4: global default margin", () => {
    expect(resolvePrice(variant, base)).toMatchObject({ pricePence: 2300, source: "global", marginBp: 1500 });
  });
  it("3: customer default beats global", () => {
    const r = resolvePrice(variant, { ...base, customerDefaultMarginBp: 1000 });
    expect(r).toMatchObject({ pricePence: 2200, source: "customer" });
  });
  it("3: a customer default of 0% is respected (not treated as missing)", () => {
    const r = resolvePrice(variant, { ...base, customerDefaultMarginBp: 0 });
    expect(r).toMatchObject({ pricePence: 2000, source: "customer" });
  });
  it("2: category margin beats customer default", () => {
    const r = resolvePrice(variant, { ...base, customerDefaultMarginBp: 1000, categoryMarginsBp: { rice: 500 } });
    expect(r).toMatchObject({ pricePence: 2100, source: "category" });
  });
  it("2: category margin for another category does not apply", () => {
    const r = resolvePrice(variant, { ...base, categoryMarginsBp: { tea: 500 } });
    expect(r.source).toBe("global");
  });
  it("1: fixed override beats everything and reports effective margin", () => {
    const r = resolvePrice(variant, {
      ...base,
      customerDefaultMarginBp: 1000,
      categoryMarginsBp: { rice: 500 },
      overridesPence: { v1: 2450 },
    });
    expect(r).toMatchObject({ pricePence: 2450, source: "override", marginBp: 2250 });
  });
  it("override works even when cost is unknown", () => {
    const r = resolvePrice({ ...variant, costPence: null }, { ...base, overridesPence: { v1: 999 } });
    expect(r).toMatchObject({ priced: true, pricePence: 999, marginBp: null });
  });
  it("no cost and no override => unpriced", () => {
    expect(resolvePrice({ ...variant, costPence: null }, base)).toEqual({
      priced: false,
      pricePence: null,
      source: "unpriced",
      marginBp: null,
    });
  });
});

describe("marginFromPrice", () => {
  it("computes margin in bp", () => {
    expect(marginFromPrice(2000, 2300)).toBe(1500);
    expect(marginFromPrice(2000, 1900)).toBe(-500);
    expect(marginFromPrice(0, 100)).toBeNull();
    expect(marginFromPrice(null, 100)).toBeNull();
  });
});
