import { describe, expect, it } from "vitest";
import { isProductVisible, visibilityReason, type VisibilityRules } from "@/domain/visibility";

const rules: VisibilityRules = {
  categoryIds: new Set(["rice", "drinks"]),
  productRules: { "p-hidden": "deny", "p-extra": "allow" },
};

describe("isProductVisible", () => {
  it("shows products in granted categories", () => {
    expect(isProductVisible("p1", "rice", rules)).toBe(true);
  });
  it("hides products in other categories", () => {
    expect(isProductVisible("p2", "spices", rules)).toBe(false);
  });
  it("a deny rule hides a product even in a granted category", () => {
    expect(isProductVisible("p-hidden", "rice", rules)).toBe(false);
  });
  it("an allow rule shows a product even outside the granted categories", () => {
    expect(isProductVisible("p-extra", "spices", rules)).toBe(true);
  });
  it("no categories and no rules shows nothing", () => {
    expect(isProductVisible("p1", "rice", { categoryIds: new Set(), productRules: {} })).toBe(false);
  });
  it("explains the reason", () => {
    expect(visibilityReason("p1", "rice", rules)).toBe("category");
    expect(visibilityReason("p2", "spices", rules)).toBe("hidden-category");
    expect(visibilityReason("p-hidden", "rice", rules)).toBe("denied");
    expect(visibilityReason("p-extra", "spices", rules)).toBe("allowed");
  });
});
