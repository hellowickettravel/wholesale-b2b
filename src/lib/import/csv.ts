/**
 * Minimal RFC 4180 CSV reader (quotes, doubled quotes, CRLF, BOM) and the catalogue import
 * column mapping. Pure; shared by the admin CSV screen and scripts/import-catalogue.mts.
 */
import { parsePercent } from "@/domain/money";
import type { ImportRow } from "./parse-name";

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

/** Quote a value for CSV output (also neutralises spreadsheet formulas). */
export function csvCell(value: string | number | null | undefined): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADER_ALIASES: Record<keyof Columns, string[]> = {
  category: ["category", "category name", "group"],
  name: ["name", "product", "product name", "item", "item name", "description of goods"],
  size: ["size", "pack size", "pack", "unit"],
  sku: ["sku", "code", "item code", "product code"],
  vat: ["vat", "vat %", "vat rate", "vat_rate"],
  description: ["description", "notes", "details"],
};

type Columns = { category: number; name: number; size: number; sku: number; vat: number; description: number };

export interface CsvIssue {
  line: number;
  message: string;
}

export interface ReadResult {
  rows: ImportRow[];
  errors: CsvIssue[];
}

/**
 * Map CSV rows to import rows. Needs a header row with at least "category" and "name".
 * Bad rows are reported by line number and skipped; they never abort the whole file.
 */
export function readImportCsv(text: string): ReadResult {
  const errors: CsvIssue[] = [];
  if (text.length > MAX_IMPORT_BYTES) return { rows: [], errors: [{ line: 0, message: "File is larger than 2 MB." }] };
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], errors: [{ line: 0, message: "The file is empty." }] };

  const header = table[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, " "));
  const col = {} as Columns;
  for (const key of Object.keys(HEADER_ALIASES) as (keyof Columns)[]) {
    col[key] = header.findIndex((h) => HEADER_ALIASES[key].includes(h));
  }
  if (col.category < 0 || col.name < 0) {
    return { rows: [], errors: [{ line: 1, message: 'The first row must be a header with "category" and "name" columns.' }] };
  }
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    return { rows: [], errors: [{ line: 0, message: `Too many rows (max ${MAX_IMPORT_ROWS}). Split the file.` }] };
  }

  const rows: ImportRow[] = [];
  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").replace(/\s+/g, " ").trim() : "");
  table.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const category = cell(r, col.category);
    const name = cell(r, col.name);
    if (!category || !name) {
      errors.push({ line, message: !name ? "Missing product name." : "Missing category." });
      return;
    }
    if (name.length > 200 || category.length > 120) {
      errors.push({ line, message: "Name or category is too long." });
      return;
    }
    const size = cell(r, col.size);
    if (size.length > 60) {
      errors.push({ line, message: "Size is too long (max 60 characters)." });
      return;
    }
    const sku = cell(r, col.sku);
    if (sku.length > 60) {
      errors.push({ line, message: "SKU is too long (max 60 characters)." });
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
    const description = cell(r, col.description).slice(0, 4000);
    rows.push({ category, name, size: size || undefined, sku: sku || undefined, vatBp, description: description || undefined, line });
  });
  return { rows, errors };
}
