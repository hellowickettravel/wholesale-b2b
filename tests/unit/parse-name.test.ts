import { describe, expect, it } from "vitest";
import { extractSize, groupItems, parseItemName, slugify, toDisplayCase } from "@/lib/import/parse-name";

describe("extractSize", () => {
  it.each([
    ["BASANT BASMATI RICE 20 KGS", "20 kg", 20000],
    ["BASANT BASMATI RICE 5KG", "5 kg", 5000],
    ["MDH CHANA MASALA 100G", "100 g", 100],
    ["TURMERIC POWDER 400 GMS", "400 g", 400],
    ["CUMIN SEEDS 1 KG", "1 kg", 1000],
    ["SUNFLOWER OIL 20 LTR", "20 L", 20000],
    ["MANGO JUICE 1.5L X 6", "1.5 L × 6", 9000],
    ["COCA COLA 330ML X 24", "330 ml × 24", 7920],
    ["COCA COLA 24 X 330ML", "330 ml × 24", 7920],
    ["FOIL CONTAINERS PACK OF 100", "100 pcs", 100],
    ["NAPKINS 500 PCS", "500 pcs", 500],
    ["PAPER CUP 8OZ", "8 oz", 8],
  ])("%s -> %s", (name, label, sortKey) => {
    const s = extractSize(name);
    expect(s?.label).toBe(label);
    expect(s?.sortKey).toBe(sortKey);
  });

  it("returns null when there is no size", () => {
    expect(extractSize("ROSE WATER")).toBeNull();
    expect(extractSize("7UP")).toBeNull();
  });

  it("handles a size followed by a note", () => {
    expect(extractSize("TILDA BASMATI 20KG (NEW PACK)")?.label).toBe("20 kg");
  });
});

describe("parseItemName", () => {
  it("strips the size to get the base name", () => {
    const p = parseItemName("BASANT BASMATI RICE 20 KGS");
    expect(p.baseName).toBe("BASANT BASMATI RICE");
    expect(p.displayName).toBe("Basant Basmati Rice");
    expect(p.groupKey).toBe("BASANT BASMATI RICE");
  });
  it("keeps notes after the size", () => {
    expect(parseItemName("TILDA BASMATI 20KG (NEW PACK)").baseName).toBe("TILDA BASMATI (NEW PACK)");
  });
  it("keeps vowel-less brand codes upper case", () => {
    expect(toDisplayCase("MDH CHANA MASALA")).toBe("MDH Chana Masala");
    expect(toDisplayCase("TRS MOONG DAL")).toBe("TRS Moong Dal");
  });
});

describe("groupItems", () => {
  it("groups sizes of the same product within a category, sorted small to large", () => {
    const r = groupItems([
      { category: "Rice", name: "BASANT BASMATI RICE 20 KGS" },
      { category: "Rice", name: "BASANT BASMATI RICE 5 KG" },
      { category: "Rice", name: "Basant Basmati Rice 10kg" },
      { category: "Rice", name: "TILDA BASMATI RICE 20 KG" },
    ]);
    expect(r.products).toHaveLength(2);
    expect(r.products[0].variants.map((v) => v.sizeLabel)).toEqual(["5 kg", "10 kg", "20 kg"]);
  });
  it("does not group across categories", () => {
    const r = groupItems([
      { category: "Powders", name: "CHILLI 1KG" },
      { category: "Whole Spices", name: "CHILLI 500G" },
    ]);
    expect(r.products).toHaveLength(2);
  });
  it("reports duplicates and size-less rows", () => {
    const r = groupItems([
      { category: "Rice", name: "SONA MASOORI 20KG" },
      { category: "Rice", name: "SONA MASOORI 20 KGS" },
      { category: "Groceries", name: "ROSE WATER" },
    ]);
    expect(r.duplicates).toEqual(["SONA MASOORI 20 KGS"]);
    expect(r.noSize).toEqual(["ROSE WATER"]);
    expect(r.products.find((p) => p.name === "Rose Water")?.variants[0].sizeLabel).toBe("Each");
  });
  it("uses an explicit size column when provided", () => {
    const r = groupItems([{ category: "Drinks", name: "THUMS UP", size: "330ML x 24" }]);
    expect(r.products[0].variants[0].sizeLabel).toBe("330 ml × 24");
  });
});

describe("slugify", () => {
  it("makes url-safe slugs", () => {
    expect(slugify("Tea Powders / Milk Mix")).toBe("tea-powders-milk-mix");
    expect(slugify("Pulses, Nuts & Groceries")).toBe("pulses-nuts-and-groceries");
  });
});
