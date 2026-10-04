/**
 * Runs a catalogue import against Supabase. Takes the client as a parameter so the admin
 * screen can pass the ADMIN'S OWN client (RLS + audit log name the admin) and the CLI script
 * can pass a service-role client. No secrets or server-only imports here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { readImportCsv, type CsvIssue } from "./csv";
import { groupItems } from "./parse-name";
import { planImport, type ExistingProduct, type ImportState, type PreviewProduct } from "./plan";

type Client = SupabaseClient<Database>;

export interface ImportResult {
  applied: boolean;
  rowCount: number;
  errors: CsvIssue[];
  noSize: string[];
  duplicates: string[];
  categoriesCreated: string[];
  productsCreated: number;
  productsMatched: number;
  variantsCreated: number;
  variantsMatched: number;
  preview: PreviewProduct[];
}

const PAGE = 1000;
const BATCH = 500;

async function pageAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) return all;
  }
}

export async function loadImportState(client: Client): Promise<ImportState> {
  const { data: categories, error } = await client.from("categories").select("id, name, slug, sort, default_vat_rate_bp");
  if (error) throw new Error(`load categories: ${error.message}`);
  const rows = await pageAll((from, to) =>
    client.from("products").select("id, slug, source_ref, product_variants(size_label, source_ref)").order("id").range(from, to),
  );
  const products = new Map<string, ExistingProduct>();
  const productSlugs = new Set<string>();
  for (const p of rows) {
    productSlugs.add(p.slug);
    if (p.source_ref) products.set(p.source_ref, { id: p.id, source_ref: p.source_ref, variants: p.product_variants ?? [] });
  }
  return { categories: categories ?? [], products, productSlugs };
}

async function insertBatches<T extends object>(client: Client, table: "categories" | "products" | "product_variants", rows: T[]) {
  for (let i = 0; i < rows.length; i += BATCH) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows are typed by planImport
    const { error } = await client.from(table).insert(rows.slice(i, i + BATCH) as any);
    if (error) throw new Error(`insert ${table}: ${error.message}`);
  }
}

/**
 * Parse, group, plan and (unless dryRun) insert. Inserts run in dependency order and are
 * insert-only, so a run interrupted half-way is completed by simply running it again.
 */
export async function runImport(
  client: Client,
  csvText: string,
  opts: { source: string; supplierId: string | null; dryRun: boolean; newId?: () => string },
): Promise<ImportResult> {
  const { rows, errors } = readImportCsv(csvText);
  const grouped = groupItems(rows);
  const state = await loadImportState(client);
  const plan = planImport(grouped, state, {
    source: opts.source,
    supplierId: opts.supplierId,
    newId: opts.newId ?? (() => crypto.randomUUID()),
  });

  if (!opts.dryRun) {
    await insertBatches(client, "categories", plan.categories);
    await insertBatches(client, "products", plan.products);
    await insertBatches(client, "product_variants", plan.variants);
  }

  return {
    applied: !opts.dryRun,
    rowCount: rows.length,
    errors,
    noSize: grouped.noSize,
    duplicates: grouped.duplicates,
    categoriesCreated: plan.categories.map((c) => c.name),
    productsCreated: plan.products.length,
    productsMatched: plan.matchedProducts,
    variantsCreated: plan.variants.length,
    variantsMatched: plan.matchedVariants,
    preview: plan.preview,
  };
}
