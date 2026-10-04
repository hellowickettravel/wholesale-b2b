/**
 * Catalogue import from a CSV (columns: category, name, size?, sku?, vat?, description?).
 * Same code as the admin CSV screen (src/lib/import/apply.ts). Dry run unless --apply.
 *
 *   npx tsx --env-file=.env.local scripts/import-catalogue.mts data/import/shrivi-items.csv \
 *     --supplier "Shrivi Limited" --source shrivi_items [--apply]
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role: run it only on
 * a trusted machine). Idempotent: running it again adds nothing that already exists.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";
import { runImport } from "../src/lib/import/apply";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    supplier: { type: "string", default: "Shrivi Limited" },
    source: { type: "string", default: "csv" },
    apply: { type: "boolean", default: false },
  },
});

const file = positionals[0];
if (!file) {
  console.error("Usage: import-catalogue.mts <file.csv> [--supplier NAME] [--source LABEL] [--apply]");
  process.exit(2);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. --env-file=.env.local).");
  process.exit(2);
}
const source = values.source!.replace(/[^a-z0-9_-]/gi, "_").slice(0, 40);
const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function supplierId(name: string): Promise<string | null> {
  const { data, error } = await client.from("suppliers").select("id, name").ilike("name", name.replace(/[\\%_]/g, "\\$&"));
  if (error) throw new Error(error.message);
  if (data?.length) return data[0].id;
  if (!values.apply) {
    console.log(`Supplier "${name}" does not exist yet; it will be created with --apply.`);
    return null;
  }
  const created = await client.from("suppliers").insert({ name }).select("id").single();
  if (created.error) throw new Error(created.error.message);
  console.log(`Created supplier "${name}".`);
  return created.data.id;
}

const text = readFileSync(file, "utf8");
const result = await runImport(client, text, { source, supplierId: await supplierId(values.supplier!), dryRun: !values.apply });

console.log(`\n${result.applied ? "IMPORTED" : "DRY RUN (nothing written; add --apply)"} from ${file}`);
console.log(`  rows read          ${result.rowCount}`);
console.log(`  rows with errors   ${result.errors.length}`);
console.log(`  categories new     ${result.categoriesCreated.length}${result.categoriesCreated.length ? `  (${result.categoriesCreated.join(", ")})` : ""}`);
console.log(`  products new       ${result.productsCreated}   already there ${result.productsMatched}`);
console.log(`  sizes new          ${result.variantsCreated}   already there ${result.variantsMatched}`);
for (const e of result.errors) console.log(`  ! line ${e.line}: ${e.message}`);
if (result.noSize.length) console.log(`\n  No size found (imported as "Each"):\n    ${result.noSize.join("\n    ")}`);
if (result.duplicates.length) console.log(`\n  Duplicate rows skipped:\n    ${result.duplicates.join("\n    ")}`);
console.log("\nEvery new size has no cost and shows as \"needs price\" in /admin/products.");
