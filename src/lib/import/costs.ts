/**
 * Bulk cost import: read a CSV of costs (our own price sheet, or a supplier's "item, price" list), match each row to
 * an existing size in the catalogue, and plan what would change. Pure: the admin screen and the tests share it.
 * Matching, in order: variant_id (exact, from our price sheet), sku, then product name + size (+ category).
 */
import { parsePercent, parsePounds } from "@/domain/money";
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, parseCsv, type CsvIssue } from "./csv";
import { explicitSize, groupItems, normaliseKey } from "./parse-name";

export interface CostRow {
  line: number;
  variantId?: string;
  sku?: string;
  category?: string;
  name?: string;
  size?: string;
  costPence: number;
  vatBp?: number;
  supplier?: string;
}

export interface CostRead {
  rows: CostRow[];
  /** Rows that had no cost in them (a half-filled sheet is normal). */
  blank: number;
  errors: CsvIssue[];
}

const ALIASES = {
  variantId: ["variant_id", "variant id", "id", "size id"],
  sku: ["sku", "code", "item code", "product code"],
  category: ["category", "category name", "group"],
  name: ["name", "product", "product name", "item", "item name"],
  size: ["size", "pack size", "pack", "unit"],
  cost: ["cost", "cost price", "cost (£)", "cost £", "cost_gbp", "unit cost", "price", "buy price", "our cost"],
  vat: ["vat", "vat %", "vat rate", "vat_rate"],
  supplier: ["supplier", "supplier name"],
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_COST_PENCE = 100_000_00; // £100,000 a unit: anything above is a typo

/** "£12.50", "12.5", "1,250.00" and "12,50" (a comma used as the decimal point) to pence; null if not a price. */
export function parseCost(text: string): number | null {
  let t = text.trim().replace(/^£\s*/, "").replace(/\s+/g, "");
  if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(",", ".");
  return parsePounds(t);
}

export function readCostCsv(text: string): CostRead {
  if (text.length > MAX_IMPORT_BYTES) return { rows: [], blank: 0, errors: [{ line: 0, message: "File is larger than 2 MB." }] };
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], blank: 0, errors: [{ line: 0, message: "The file is empty." }] };
  const header = table[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, " "));
  const col = {} as Record<keyof typeof ALIASES, number>;
  for (const key of Object.keys(ALIASES) as (keyof typeof ALIASES)[]) col[key] = header.findIndex((h) => (ALIASES[key] as readonly string[]).includes(h));
  if (col.cost < 0) return { rows: [], blank: 0, errors: [{ line: 1, message: 'The first row must be a header with a "cost" column.' }] };
  if (col.variantId < 0 && col.sku < 0 && col.name < 0) {
    return { rows: [], blank: 0, errors: [{ line: 1, message: 'The header needs a way to find each size: "variant_id", "sku" or "product" (name).' }] };
  }
  if (table.length - 1 > MAX_IMPORT_ROWS) return { rows: [], blank: 0, errors: [{ line: 0, message: `Too many rows (max ${MAX_IMPORT_ROWS}). Split the file.` }] };

  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").replace(/\s+/g, " ").trim() : "");
  const rows: CostRow[] = [];
  const errors: CsvIssue[] = [];
  let blank = 0;
  table.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const costText = cell(r, col.cost);
    if (costText === "") {
      blank++;
      return;
    }
    const cost = parseCost(costText);
    if (cost === null || cost <= 0 || cost > MAX_COST_PENCE) {
      errors.push({ line, message: `Cost "${costText.slice(0, 30)}" is not a price above £0 (write it like 12.50).` });
      return;
    }
    const variantId = cell(r, col.variantId).toLowerCase();
    if (variantId && !UUID.test(variantId)) {
      errors.push({ line, message: "variant_id is not valid. Leave it exactly as downloaded." });
      return;
    }
    const sku = cell(r, col.sku);
    const name = cell(r, col.name);
    if (!variantId && !sku && !name) {
      errors.push({ line, message: "No variant_id, sku or product name to find the size by." });
      return;
    }
    let vatBp: number | undefined;
    const vatText = cell(r, col.vat);
    if (vatText) {
      const bp = parsePercent(vatText);
      if (bp === null || bp < 0 || bp > 10000) {
        errors.push({ line, message: `VAT "${vatText}" is not a percentage between 0 and 100.` });
        return;
      }
      vatBp = bp;
    }
    rows.push({
      line,
      variantId: variantId || undefined,
      sku: sku || undefined,
      category: cell(r, col.category) || undefined,
      name: name || undefined,
      size: cell(r, col.size) || undefined,
      costPence: cost,
      vatBp,
      supplier: cell(r, col.supplier) || undefined,
    });
  });
  return { rows, blank, errors };
}

export interface CostVariant {
  id: string;
  productName: string;
  categoryName: string;
  sizeLabel: string;
  sku: string | null;
  sourceRef: string | null;
  costPence: number | null;
  vatBp: number;
  supplierId: string | null;
  supplierName: string | null;
}

export interface CostChange {
  id: string;
  line: number;
  label: string;
  oldCostPence: number | null;
  newCostPence: number;
  /** Set only when the file gave a VAT rate that differs from the current one. */
  vatBp?: number;
  oldVatBp?: number;
  /** Set only when the file named a different supplier. */
  supplierId?: string;
  supplierName?: string;
  /** A change of more than 50% either way: worth a second look. */
  big: boolean;
}

export interface CostPlan {
  changes: CostChange[];
  unchanged: number;
  notFound: { line: number; label: string }[];
  ambiguous: { line: number; label: string; matches: number }[];
  unknownSupplier: { line: number; label: string; supplier: string }[];
  repeated: { line: number; label: string }[];
}

const labelOf = (v: Pick<CostVariant, "productName" | "sizeLabel">) => `${v.productName} · ${v.sizeLabel}`;
const rowLabel = (r: CostRow) => [r.name ?? r.sku ?? r.variantId, r.size].filter(Boolean).join(" · ");
const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => (m.has(k) ? m.get(k)!.push(v) : m.set(k, [v]));

export function planCosts(rows: CostRow[], variants: CostVariant[], suppliers: { id: string; name: string }[]): CostPlan {
  const byId = new Map(variants.map((v) => [v.id, v]));
  const bySku = new Map<string, CostVariant[]>();
  const bySourceRef = new Map<string, CostVariant[]>();
  const byNameSize = new Map<string, CostVariant[]>();
  const bySupplier = new Map(suppliers.map((s) => [s.name.trim().toLowerCase(), s]));
  for (const v of variants) {
    if (v.sku) push(bySku, v.sku.trim().toLowerCase(), v);
    if (v.sourceRef) push(bySourceRef, normaliseKey(v.sourceRef), v);
    const size = v.sizeLabel.trim().toLowerCase();
    push(byNameSize, `${normaliseKey(v.categoryName)}::${normaliseKey(v.productName)}::${size}`, v);
    push(byNameSize, `*::${normaliseKey(v.productName)}::${size}`, v);
  }

  const plan: CostPlan = { changes: [], unchanged: 0, notFound: [], ambiguous: [], unknownSupplier: [], repeated: [] };
  const planned = new Map<string, CostChange | "same">();

  for (const r of rows) {
    let matches: CostVariant[] = [];
    if (r.variantId) {
      const v = byId.get(r.variantId);
      if (v) matches = [v];
    } else if (r.sku && bySku.has(r.sku.toLowerCase())) {
      matches = bySku.get(r.sku.toLowerCase())!;
    } else if (r.name) {
      if (!r.size) matches = bySourceRef.get(normaliseKey(r.name)) ?? [];
      if (!matches.length) {
        const g = groupItems([{ category: r.category ?? "x", name: r.name, size: r.size }]).products[0];
        const size = (r.size ? explicitSize(r.size).label : g.variants[0].sizeLabel).toLowerCase();
        const cat = r.category ? normaliseKey(r.category) : "*";
        matches = byNameSize.get(`${cat}::${g.nameKey}::${size}`) ?? [];
      }
    }
    if (!matches.length) {
      plan.notFound.push({ line: r.line, label: rowLabel(r) });
      continue;
    }
    if (matches.length > 1) {
      plan.ambiguous.push({ line: r.line, label: rowLabel(r), matches: matches.length });
      continue;
    }
    const v = matches[0];

    let supplierId: string | undefined;
    let supplierName: string | undefined;
    if (r.supplier) {
      const s = bySupplier.get(r.supplier.trim().toLowerCase());
      if (!s) {
        plan.unknownSupplier.push({ line: r.line, label: labelOf(v), supplier: r.supplier });
        continue;
      }
      if (s.id !== v.supplierId) {
        supplierId = s.id;
        supplierName = s.name;
      }
    }
    const vatChanged = r.vatBp !== undefined && r.vatBp !== v.vatBp;
    const costChanged = r.costPence !== v.costPence;
    if (planned.has(v.id)) plan.repeated.push({ line: r.line, label: labelOf(v) });

    if (!costChanged && !vatChanged && !supplierId) {
      planned.set(v.id, "same");
      continue;
    }
    const old = v.costPence;
    planned.set(v.id, {
      id: v.id,
      line: r.line,
      label: labelOf(v),
      oldCostPence: old,
      newCostPence: r.costPence,
      vatBp: vatChanged ? r.vatBp : undefined,
      oldVatBp: vatChanged ? v.vatBp : undefined,
      supplierId,
      supplierName,
      big: old !== null && old > 0 && Math.abs(r.costPence - old) * 2 > old,
    });
  }
  for (const p of planned.values()) {
    if (p === "same") plan.unchanged++;
    else plan.changes.push(p);
  }
  plan.changes.sort((a, b) => a.line - b.line);
  return plan;
}
