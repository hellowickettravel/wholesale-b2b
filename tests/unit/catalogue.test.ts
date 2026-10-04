import { describe, expect, it } from "vitest";
import { catalogueHref, likePattern, parseCatalogueQuery, searchWords, sizeRange } from "@/lib/catalogue/query";
import { csvCell, parseCsv, readImportCsv } from "@/lib/import/csv";
import { groupItems } from "@/lib/import/parse-name";
import { planImport, productRef, uniqueSlug, type ImportState } from "@/lib/import/plan";
import { variantRowsFrom } from "@/lib/validation/catalogue";

describe("parseCsv", () => {
  it("handles quotes, doubled quotes, commas, CRLF, BOM and blank lines", () => {
    const text = '﻿category,name\r\nRice,"BASMATI, 5 KG"\r\n\r\nSauces,"MINT ""EXTRA"" SAUCE"\nDrinks,"LINE\nBREAK"';
    expect(parseCsv(text)).toEqual([
      ["category", "name"],
      ["Rice", "BASMATI, 5 KG"],
      ["Sauces", 'MINT "EXTRA" SAUCE'],
      ["Drinks", "LINE\nBREAK"],
    ]);
  });
  it("keeps a last line without a newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("csvCell", () => {
  it("quotes when needed and neutralises spreadsheet formulas", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(null)).toBe("");
    expect(csvCell(3)).toBe("3");
  });
});

describe("readImportCsv", () => {
  it("maps header aliases case-insensitively and parses VAT to basis points", () => {
    const { rows, errors } = readImportCsv("Category,Product Name,Pack Size,Code,VAT %\nDrinks,MANGO DRINK,330ML x 24,MD1,20\n");
    expect(errors).toEqual([]);
    expect(rows).toEqual([{ category: "Drinks", name: "MANGO DRINK", size: "330ML x 24", sku: "MD1", vatBp: 2000, description: undefined, line: 2 }]);
  });
  it("needs category and name columns", () => {
    expect(readImportCsv("item,size\nX,1kg").errors[0].message).toMatch(/category.*name/);
  });
  it("reports bad rows by line and keeps the good ones", () => {
    const { rows, errors } = readImportCsv("category,name,vat\nRice,,\n,TOOR DAL\nRice,SONA 10KG,abc\nRice,SONA 20KG,0");
    expect(rows.map((r) => r.name)).toEqual(["SONA 20KG"]);
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4]);
  });
  it("rejects VAT outside 0-100", () => {
    expect(readImportCsv("category,name,vat\nRice,X 1KG,120").errors[0].message).toMatch(/VAT/);
  });
  it("never reads a cost or price column", () => {
    const { rows } = readImportCsv("category,name,cost,price\nRice,X 1KG,9.99,12.00");
    expect(Object.keys(rows[0])).not.toContain("cost");
    expect(JSON.stringify(rows)).not.toMatch(/9\.99|12\.00/);
  });
});

const RICE = { id: "cat-rice", name: "Rice", slug: "rice", sort: 1, default_vat_rate_bp: 0 };
const DRINKS = { id: "cat-drinks", name: "Drinks", slug: "drinks", sort: 2, default_vat_rate_bp: 2000 };

function state(overrides: Partial<ImportState> = {}): ImportState {
  return { categories: [RICE, DRINKS], products: new Map(), productSlugs: new Set(), ...overrides };
}
function ids() {
  let n = 0;
  return () => `id-${++n}`;
}

describe("planImport", () => {
  it("creates grouped products with sizes, no cost, category VAT default and the import key", () => {
    const g = groupItems([
      { category: "Rice", name: "BASANT BASMATI RICE 20 KGS" },
      { category: "rice", name: "Basant Basmati Rice 5kg" },
      { category: "Drinks", name: "MANGO DRINK", size: "330ML x 24" },
      { category: "Drinks", name: "MANGO DRINK", size: "1.5L x 6", vatBp: 0 },
    ]);
    const plan = planImport(g, state(), { source: "test", supplierId: "sup-1", newId: ids() });
    expect(plan.categories).toEqual([]);
    expect(plan.products.map((p) => [p.name, p.slug, p.source_ref])).toEqual([
      ["Basant Basmati Rice", "basant-basmati-rice", productRef("cat-rice", "BASANT BASMATI RICE")],
      ["Mango Drink", "mango-drink", productRef("cat-drinks", "MANGO DRINK")],
    ]);
    expect(plan.variants.map((v) => [v.size_label, v.vat_rate_bp, v.cost_pence, v.supplier_id])).toEqual([
      ["5 kg", 0, null, "sup-1"],
      ["20 kg", 0, null, "sup-1"],
      ["330 ml × 24", 2000, null, "sup-1"],
      ["1.5 L × 6", 0, null, "sup-1"],
    ]);
  });

  it("is idempotent: a second plan against the result adds nothing", () => {
    const g = groupItems([
      { category: "Rice", name: "SONA MASOORI 10KG" },
      { category: "Rice", name: "SONA MASOORI 25KG" },
    ]);
    const first = planImport(g, state(), { source: "t", supplierId: null, newId: ids() });
    const after = state({
      products: new Map(
        first.products.map((p) => [
          p.source_ref,
          { id: p.id, source_ref: p.source_ref, variants: first.variants.filter((v) => v.product_id === p.id).map((v) => ({ size_label: v.size_label, source_ref: v.source_ref })) },
        ]),
      ),
      productSlugs: new Set(first.products.map((p) => p.slug)),
    });
    const second = planImport(g, after, { source: "t", supplierId: null, newId: ids() });
    expect(second.products).toEqual([]);
    expect(second.variants).toEqual([]);
    expect(second.matchedProducts).toBe(1);
    expect(second.matchedVariants).toBe(2);
    expect(second.preview).toEqual([]);
  });

  it("adds only the missing size to an existing product, matching size labels case-insensitively", () => {
    const g = groupItems([
      { category: "Rice", name: "BASANT BASMATI RICE 5 KG" },
      { category: "Rice", name: "BASANT BASMATI RICE 10 KG" },
    ]);
    const existing = { id: "p1", source_ref: productRef("cat-rice", "BASANT BASMATI RICE"), variants: [{ size_label: "5 KG", source_ref: null }] };
    const plan = planImport(g, state({ products: new Map([[existing.source_ref, existing]]) }), { source: "t", supplierId: null, newId: ids() });
    expect(plan.products).toEqual([]);
    expect(plan.variants.map((v) => [v.product_id, v.size_label])).toEqual([["p1", "10 kg"]]);
  });

  it("creates unknown categories once, after the existing sort order", () => {
    const g = groupItems([
      { category: "Frozen", name: "PARATHA 20 PCS" },
      { category: "FROZEN", name: "SAMOSA 50 PCS" },
    ]);
    const plan = planImport(g, state(), { source: "t", supplierId: null, newId: ids() });
    expect(plan.categories).toEqual([{ id: "id-1", name: "Frozen", slug: "frozen", sort: 3, default_vat_rate_bp: 0 }]);
    expect(plan.products.every((p) => p.category_id === "id-1")).toBe(true);
  });

  it("matches a category by slug when the wording differs", () => {
    const g = groupItems([{ category: "Pulses Nuts & Groceries", name: "TOOR DAL 2KG" }]);
    const pulses = { id: "cat-p", name: "Pulses, Nuts & Groceries", slug: "pulses-nuts-and-groceries", sort: 3, default_vat_rate_bp: 0 };
    const plan = planImport(g, state({ categories: [pulses] }), { source: "t", supplierId: null, newId: ids() });
    expect(plan.categories).toEqual([]);
    expect(plan.products[0].category_id).toBe("cat-p");
  });

  it("gives clashing slugs a numeric suffix", () => {
    const g = groupItems([
      { category: "Rice", name: "CHILLI 1KG" },
      { category: "Drinks", name: "CHILLI 1L" },
    ]);
    const plan = planImport(g, state({ productSlugs: new Set(["chilli"]) }), { source: "t", supplierId: null, newId: ids() });
    expect(plan.products.map((p) => p.slug)).toEqual(["chilli-2", "chilli-3"]);
  });
});

describe("uniqueSlug", () => {
  it("stays within 80 characters with a suffix", () => {
    const long = "x".repeat(90);
    const taken = new Set(["x".repeat(80)]);
    const s = uniqueSlug(long, taken);
    expect(s).toBe(`${"x".repeat(78)}-2`);
    expect(s.length).toBe(80);
  });
});

describe("catalogue query", () => {
  it("parses and sanitises URL parameters", () => {
    expect(parseCatalogueQuery({ category: "Rice", q: "  basmati   20kg ", page: "2" })).toEqual({ category: "rice", q: "basmati 20kg", words: ["basmati", "20kg"], page: 2 });
    expect(parseCatalogueQuery({ category: "../etc", page: "-3" })).toEqual({ category: null, q: "", words: [], page: 1 });
    expect(parseCatalogueQuery({ page: ["5", "6"] }).page).toBe(5);
    expect(parseCatalogueQuery({ page: "99999" }).page).toBe(1);
  });
  it("splits search words, dedupes and caps them", () => {
    expect(searchWords("Toor  toor DAL, (2kg)")).toEqual(["toor", "dal", "2kg"]);
    expect(searchWords("a b c d e f g h")).toHaveLength(6);
  });
  it("escapes LIKE wildcards", () => {
    expect(likePattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });
  it("builds clean catalogue links", () => {
    expect(catalogueHref({})).toBe("/catalogue");
    expect(catalogueHref({ category: "rice", q: "sona masoori", page: 1 })).toBe("/catalogue?category=rice&q=sona+masoori");
    expect(catalogueHref({ page: 3 })).toBe("/catalogue?page=3");
  });
  it("summarises size ranges", () => {
    expect(sizeRange([])).toBeNull();
    expect(sizeRange(["5 kg"])).toBe("5 kg");
    expect(sizeRange(["1 kg", "5 kg", "20 kg"])).toBe("1 kg – 20 kg");
  });
});

describe("variantRowsFrom", () => {
  it("reads v.<i>.<field> rows in index order and ignores anything else", () => {
    const fd = new FormData();
    fd.set("v.1.size_label", "20 kg");
    fd.set("v.0.size_label", "5 kg");
    fd.set("v.0.cost", "12.00");
    fd.set("v.x.size_label", "bad");
    fd.set("cost", "1");
    expect(variantRowsFrom(fd)).toEqual([{ size_label: "5 kg", cost: "12.00" }, { size_label: "20 kg" }]);
  });
});
