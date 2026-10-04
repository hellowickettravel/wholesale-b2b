/**
 * Parse supplier item names like "BASANT BASMATI RICE 20 KGS" into a base product name
 * and a pack size, then group sizes of the same product into one product with variants.
 *
 * Deliberately conservative: only groups items whose normalised base names match exactly
 * within the same category. Anything odd is reported, never guessed.
 */

export type SizeUnit = "g" | "kg" | "ml" | "l" | "oz" | "pcs";

export interface ParsedSize {
  /** Display label, e.g. "20 kg", "330 ml × 24", "100 pcs". */
  label: string;
  /** Amount per unit in the base unit (g for mass, ml for volume, pieces, oz). */
  amount: number;
  unit: SizeUnit;
  count: number;
  /** Sort key: total base quantity (g / ml / pcs), mass and volume kept comparable within kind. */
  sortKey: number;
  /** The exact text matched in the source name. */
  raw: string;
}

export interface ParsedName {
  source: string;
  baseName: string;
  displayName: string;
  size: ParsedSize | null;
  groupKey: string;
}

const UNIT_ALIASES: Array<[RegExp, SizeUnit]> = [
  [/^(KGS?|KILOS?|KILOGRAMS?)$/i, "kg"],
  [/^(G|GM|GMS|GR|GRS|GRM|GRMS|GRAMS?)$/i, "g"],
  [/^(ML|MLS)$/i, "ml"],
  [/^(L|LT|LTR|LTRS|LITRES?|LITERS?)$/i, "l"],
  [/^(OZ)$/i, "oz"],
  [/^(PCS?|PIECES?|NOS?|PC)$/i, "pcs"],
];

function unitOf(token: string): SizeUnit | null {
  for (const [re, u] of UNIT_ALIASES) if (re.test(token)) return u;
  return null;
}

const UNIT_RE = "KGS?|KILOS?|KILOGRAMS?|GMS?|GRMS?|GRS?|GRAMS?|G|MLS?|LTRS?|LITRES?|LITERS?|LT|L|OZ|PCS?|PIECES?|NOS?";
const NUM_RE = "\\d+(?:[.,]\\d+)?";
const X_RE = "\\s*[X×*]\\s*";

// Order matters: most specific first.
const PATTERNS: Array<{ re: RegExp; read: (m: RegExpExecArray) => [number, string, number] }> = [
  // 330ML X 24 / 1.5 L x 6
  {
    re: new RegExp(`(${NUM_RE})\\s*(${UNIT_RE})${X_RE}(\\d+)(?:\\s*(?:PCS?|PACK|PK|CANS?|BOTTLES?|BTLS?))?\\b`, "gi"),
    read: (m) => [parseNum(m[1]), m[2], Number(m[3])],
  },
  // 24 X 330ML / 10 x 1KG
  {
    re: new RegExp(`\\b(\\d+)${X_RE}(${NUM_RE})\\s*(${UNIT_RE})\\b`, "gi"),
    read: (m) => [parseNum(m[2]), m[3], Number(m[1])],
  },
  // PACK OF 100 / BOX OF 50
  {
    re: /\b(?:PACK|PKT|BOX|CASE)\s+OF\s+(\d+)\b/gi,
    read: (m) => [Number(m[1]), "pcs", 1],
  },
  // 20 KGS / 100G / 1.5L / 100 PCS
  {
    re: new RegExp(`(?<![\\w.])(${NUM_RE})\\s*(${UNIT_RE})\\b`, "gi"),
    read: (m) => [parseNum(m[1]), m[2], 1],
  },
];

function parseNum(s: string): number {
  return Number(s.replace(",", "."));
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

function makeSize(amount: number, unitToken: string, count: number, raw: string): ParsedSize | null {
  const unit = unitOf(unitToken) ?? (unitToken === "pcs" ? "pcs" : null);
  if (!unit || !(amount > 0) || !(count > 0)) return null;
  const base =
    unit === "kg" ? amount * 1000 : unit === "l" ? amount * 1000 : amount; // g, ml, oz, pcs as-is
  const unitLabel = unit === "l" ? "L" : unit;
  const label = `${fmtNum(amount)} ${unitLabel}${count > 1 ? ` × ${count}` : ""}`;
  return { label, amount, unit, count, sortKey: Math.round(base * count * 1000) / 1000, raw: raw.trim() };
}

/** Find the LAST size expression in the name (sizes are normally at the end). */
export function extractSize(name: string): ParsedSize | null {
  let best: { index: number; end: number; size: ParsedSize } | null = null;
  for (const { re, read } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(name))) {
      const [amount, unit, count] = read(m);
      const size = makeSize(amount, unit, count, m[0]);
      if (!size) continue;
      const end = m.index + m[0].length;
      // Prefer the match that ends last; on tie prefer the longer (more specific) match,
      // so "24 X 330ML" beats the bare "330ML" inside it.
      if (!best || end > best.end || (end === best.end && m.index < best.index)) {
        best = { index: m.index, end, size };
      }
    }
  }
  return best?.size ?? null;
}

export function normaliseKey(s: string): string {
  return s
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const KEEP_UPPER = new Set(["UK", "MDH", "TRS", "KTC", "USA", "XL", "XXL", "BBQ", "PET", "HD", "LD", "ML"]);

/** "BASANT BASMATI RICE" -> "Basant Basmati Rice"; keeps vowel-less short brand codes upper. */
export function toDisplayCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|-|\/|\()/)
    .map((w) => {
      const up = w.toUpperCase();
      if (KEEP_UPPER.has(up)) return up;
      if (/^[a-z]{2,4}$/.test(w) && !/[aeiouy]/.test(w)) return up;
      if (/^\d/.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join("");
}

export function parseItemName(source: string): ParsedName {
  const cleaned = source.replace(/\s+/g, " ").trim();
  const size = extractSize(cleaned);
  let base = cleaned;
  if (size) {
    const i = cleaned.toUpperCase().lastIndexOf(size.raw.toUpperCase());
    if (i >= 0) base = (cleaned.slice(0, i) + " " + cleaned.slice(i + size.raw.length)).trim();
  }
  base = base
    .replace(/\(\s*\)/g, "")
    .replace(/[\s\-–,/:]+$/g, "")
    .replace(/^[\s\-–,/:]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) base = cleaned;
  return {
    source,
    baseName: base,
    displayName: toDisplayCase(base),
    size,
    groupKey: normaliseKey(base),
  };
}

export interface ImportRow {
  category: string;
  name: string;
  /** Optional explicit size, overrides parsing (e.g. drinks list has its own column). */
  size?: string;
  sku?: string;
  /** Optional VAT rate for this size in basis points (else the category default). */
  vatBp?: number;
  description?: string;
  /** 1-based source line, for reports. */
  line?: number;
}

export interface GroupedVariant {
  sizeLabel: string;
  sortKey: number;
  source: string;
  sku?: string;
  vatBp?: number;
  line?: number;
}

export interface GroupedProduct {
  category: string;
  name: string;
  groupKey: string;
  /** normaliseKey(category) and normaliseKey(base name), the two halves of groupKey. */
  categoryKey: string;
  nameKey: string;
  description?: string;
  variants: GroupedVariant[];
}

export interface GroupingReport {
  products: GroupedProduct[];
  /** Rows where no size could be parsed (imported as a single "Each" variant). */
  noSize: string[];
  /** Exact duplicates (same product + same size) that were dropped. */
  duplicates: string[];
}

export function groupItems(rows: ImportRow[]): GroupingReport {
  const map = new Map<string, GroupedProduct>();
  const noSize: string[] = [];
  const duplicates: string[] = [];

  for (const row of rows) {
    const parsed = parseItemName(row.name);
    let size = parsed.size;
    if (row.size) {
      const explicit = extractSize(row.size);
      size = explicit ?? { label: row.size.trim(), amount: 0, unit: "pcs", count: 1, sortKey: 0, raw: row.size };
    }
    const categoryKey = normaliseKey(row.category);
    const key = `${categoryKey}::${parsed.groupKey}`;
    let product = map.get(key);
    if (!product) {
      product = { category: row.category.trim(), name: parsed.displayName, groupKey: key, categoryKey, nameKey: parsed.groupKey, variants: [] };
      map.set(key, product);
    }
    if (!product.description && row.description?.trim()) product.description = row.description.trim();
    const sizeLabel = size?.label ?? "Each";
    if (!size) noSize.push(row.name);
    if (product.variants.some((v) => v.sizeLabel.toLowerCase() === sizeLabel.toLowerCase())) {
      duplicates.push(row.name);
      continue;
    }
    product.variants.push({
      sizeLabel,
      sortKey: size?.sortKey ?? 0,
      source: row.size ? `${row.name} | ${row.size}` : row.name,
      sku: row.sku,
      vatBp: row.vatBp,
      line: row.line,
    });
  }

  const products = [...map.values()];
  for (const p of products) p.variants.sort((a, b) => a.sortKey - b.sortKey);
  return { products, noSize, duplicates };
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
