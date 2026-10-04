/**
 * Converts the client's source lists into import CSVs (format: data/import/README.md).
 *
 *   data/source/SHRIVI_ITEMS.pdf                    -> data/import/shrivi-items.csv
 *   data/source/Drinks_List.pdf                     -> data/import/drinks-list.csv
 *   data/source/shrivi-packaging-transcribed.psv    -> data/import/shrivi-packaging.csv
 *     (hand transcription of the image-only Shrivi_Limited_Packaging_Catalogue_.pdf)
 *   and data/import/CONVERSION-NOTES.md with everything that needs a human look.
 *
 * Packaging photos: crops named p<page>-r<row>-c<col>.webp (scripts/crop-catalogue-photos.mts)
 * are copied from --photos <dir> to public/images/products/<slug>.webp for the first tile of
 * each product, and referenced in the CSV's image column.
 *
 *   npx tsx scripts/convert-sources.mts [--photos <cropDir>]
 * Needs `pdftotext` (poppler-utils). Never invents prices or items.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { csvCell } from "../src/lib/import/csv";
import { groupItems, normaliseKey, parseItemName, slugify, type ImportRow } from "../src/lib/import/parse-name";

const { values } = parseArgs({ options: { photos: { type: "string" } } });
const SRC = "data/source";
const OUT = "data/import";
mkdirSync(OUT, { recursive: true });
const notes: string[] = [];

/** Section headings in SHRIVI_ITEMS.pdf -> launch category names (migration 0005). */
const SHRIVI_CATEGORIES: Record<string, string> = {
  RICE: "Rice",
  "TEA POWDERS/MILK MIX POWDERS": "Tea Powders & Milk Mix",
  "RESTAURANT PACKING/CLEANING": "Restaurant Packing & Cleaning",
  SAUCES: "Sauces",
  DRINKS: "Drinks",
  "RESTAURANT GROCERIES": "Restaurant Groceries",
  "FOOD COLOURS": "Food Colours",
  "WHOLE SPICES": "Whole Spices",
  "PULSES/NUTS/GROCERIES": "Pulses, Nuts & Groceries",
  "POWDERS/MASALA GROUNDED": "Powders & Ground Masala",
  "FLOURS/ATTA/RAVA": "Flours, Atta & Rava",
};

function pdfText(file: string): string {
  return execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" });
}

function writeCsv(file: string, rows: ImportRow[], withImage = false) {
  const header = ["category", "name", "size", ...(withImage ? ["image"] : [])];
  const lines = [header.join(","), ...rows.map((r) => [r.category, r.name, r.size ?? "", ...(withImage ? [r.image ?? ""] : [])].map(csvCell).join(","))];
  writeFileSync(path.join(OUT, file), lines.join("\n") + "\n");
}

function summary(label: string, rows: ImportRow[]) {
  const g = groupItems(rows);
  const sizes = g.products.reduce((n, p) => n + p.variants.length, 0);
  notes.push(`\n## ${label}\n\n${rows.length} rows -> ${g.products.length} products with ${sizes} sizes.`);
  if (g.noSize.length) notes.push(`\nNo pack size found (imported as "Each"; fix the size on the product page if needed):\n${g.noSize.map((n) => `- ${n}`).join("\n")}`);
  if (g.duplicates.length) notes.push(`\nDuplicate rows dropped:\n${g.duplicates.map((n) => `- ${n}`).join("\n")}`);
  return g;
}

// ---------------------------------------------------------------- SHRIVI_ITEMS.pdf
{
  const text = pdfText(path.join(SRC, "SHRIVI_ITEMS.pdf"));
  const rows: ImportRow[] = [];
  let category: string | null = null;
  const unknown: string[] = [];
  let expected = 1;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const heading = SHRIVI_CATEGORIES[line.replace(/\s+/g, " ")];
    if (heading) {
      category = heading;
      continue;
    }
    const m = /^(\d+)\s+(.+)$/.exec(line);
    if (!m) continue;
    const n = Number(m[1]);
    if (n !== expected) notes.push(`- SHRIVI_ITEMS: item number ${n} found where ${expected} was expected.`);
    expected = n + 1;
    if (!category) {
      unknown.push(line);
      continue;
    }
    rows.push({ category, name: m[2].replace(/\s+/g, " ").trim() });
  }
  if (unknown.length) notes.push(`- SHRIVI_ITEMS: rows before any category heading: ${unknown.join("; ")}`);
  writeCsv("shrivi-items.csv", rows);
  summary(`SHRIVI_ITEMS.pdf (${expected - 1} numbered items)`, rows);
}

// ---------------------------------------------------------------- Drinks_List.pdf
{
  const text = pdfText(path.join(SRC, "Drinks_List.pdf"));
  const rows: ImportRow[] = [];
  const drinkNotes: string[] = [];
  // Obvious brand misspellings in the list (reported below so the owner can veto).
  const fixes: Array<[RegExp, string]> = [
    [/\bEvain\b/i, "Evian"],
    [/\bThumsup\b/i, "Thums Up"],
  ];
  for (const raw of text.split("\n")) {
    const m = /^\s*(\d+)\s+(.+?)\s{2,}(\S.*?)\s*$/.exec(raw);
    if (!m) continue;
    let name = m[2].trim();
    let size = m[3].trim();
    for (const [re, to] of fixes) {
      if (re.test(name)) {
        drinkNotes.push(`- Drinks list: spelled "${name.match(re)![0]}" as "${to}".`);
        name = name.replace(re, to);
      }
    }
    // The pack size column must agree with the size in the name ("Coca Cola 1.75L" vs "1.5L X 6").
    const inName = parseItemName(name).size;
    const unit = /^([\d.]+\s*(?:ML|L))\s*X\s*(\d+)$/i.exec(size);
    if (inName && unit && inName.raw.replace(/\s+/g, "").toUpperCase() !== unit[1].replace(/\s+/g, "").toUpperCase()) {
      drinkNotes.push(`- Drinks list: "${m[2].trim()}" has pack size "${size}"; used the bottle size from the name (${inName.raw} X ${unit[2]}). Check with the supplier.`);
      size = `${inName.raw} X ${unit[2]}`;
    }
    rows.push({ category: "Drinks", name, size });
  }
  writeCsv("drinks-list.csv", rows);
  summary("Drinks_List.pdf", rows);
  notes.push("", ...new Set(drinkNotes));
}

// ---------------------------------------------------------------- Packaging catalogue (transcribed)
{
  const lines = readFileSync(path.join(SRC, "shrivi-packaging-transcribed.psv"), "utf8").split("\n");
  const rows: ImportRow[] = [];
  const firstTile = new Map<string, string>();
  const flagged: string[] = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [page, row, col, name, sizes, pack, note] = line.split("|").map((s) => (s ?? "").trim());
    if (note) flagged.push(`- page ${page}, row ${row}, tile ${col}: ${name === "SKIP" ? "not imported" : name}: ${note}`);
    if (name === "SKIP") continue;
    const key = `${normaliseKey("Restaurant Packing & Cleaning")}::${parseItemName(name).groupKey}`;
    if (!firstTile.has(key) && row !== "0") firstTile.set(key, `p${page}-r${row}-c${col}.webp`);
    const parts = sizes ? sizes.split(" / ").map((s) => s.trim()) : [""];
    for (const size of parts) {
      const label = [size, pack].filter(Boolean).join(" · ") || "Each";
      if (label.length > 60) notes.push(`- Packaging: size label over 60 characters, will be cut: ${label}`);
      rows.push({ category: "Restaurant Packing & Cleaning", name, size: label });
    }
  }
  // Photos: copy the first tile of each product into the site.
  let photos = 0;
  const missingPhoto: string[] = [];
  const g = groupItems(rows);
  const imageByKey = new Map<string, string>();
  for (const p of g.products) {
    const tile = firstTile.get(p.groupKey);
    const from = tile && values.photos ? path.join(values.photos, tile) : null;
    const dest = `/images/products/${slugify(p.name)}.webp`;
    if (from && existsSync(from)) {
      mkdirSync("public/images/products", { recursive: true });
      copyFileSync(from, path.join("public", dest));
      imageByKey.set(p.groupKey, dest);
      photos++;
    } else if (existsSync(path.join("public", dest))) {
      imageByKey.set(p.groupKey, dest);
      photos++;
    } else missingPhoto.push(p.name);
  }
  for (const r of rows) r.image = imageByKey.get(`${normaliseKey(r.category)}::${parseItemName(r.name).groupKey}`);
  writeCsv("shrivi-packaging.csv", rows, true);
  summary("Shrivi_Limited_Packaging_Catalogue_.pdf (transcribed by hand)", rows);
  notes.push(`\n${photos} products have a photo cropped from the catalogue.${missingPhoto.length ? ` No photo found for: ${missingPhoto.join(", ")}.` : ""}`);
  if (flagged.length) notes.push(`\nTranscription notes (check with the supplier):\n${flagged.join("\n")}`);
}

writeFileSync(
  path.join(OUT, "CONVERSION-NOTES.md"),
  `# Conversion notes\n\nGenerated by \`scripts/convert-sources.mts\`. Nothing here has a price: every size is imported as "needs price".\n${notes.join("\n")}\n`,
);
console.log(readFileSync(path.join(OUT, "CONVERSION-NOTES.md"), "utf8").slice(0, 4000));
