"use server";
import { z } from "zod";
import { MAX_IMPORT_BYTES, type CsvIssue } from "@/lib/import/csv";
import { planCosts, readCostCsv, type CostChange, type CostPlan, type CostVariant } from "@/lib/import/costs";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { catalogueChanged } from "@/server/catalogue-admin";

export interface CostImportResult {
  applied: boolean;
  rowCount: number;
  blank: number;
  errors: CsvIssue[];
  changes: CostChange[];
  /** Total changes (the list above is capped for the page). */
  changeCount: number;
  unchanged: number;
  notFound: CostPlan["notFound"];
  ambiguous: CostPlan["ambiguous"];
  unknownSupplier: CostPlan["unknownSupplier"];
  repeated: CostPlan["repeated"];
  updated: number;
}

export interface CostImportState {
  error?: string;
  result?: CostImportResult;
  /** Echoed so the admin can apply exactly the file they previewed. */
  csv?: string;
  fileName?: string;
}

const input = z.object({
  csv: z.string().min(1, "Choose a CSV file.").max(MAX_IMPORT_BYTES, "The file is larger than 2 MB."),
  fileName: z.string().max(200).default(""),
  mode: z.enum(["preview", "apply"]),
});

const SHOWN = 300;

async function loadVariants(supabase: Awaited<ReturnType<typeof createClient>>): Promise<CostVariant[]> {
  const out: CostVariant[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, size_label, sku, source_ref, cost_pence, vat_rate_bp, supplier_id, suppliers(name), products!inner(name, categories!inner(name))")
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(`load sizes: ${error.message}`);
    for (const r of (data ?? []) as unknown as {
      id: string; size_label: string; sku: string | null; source_ref: string | null; cost_pence: number | null; vat_rate_bp: number; supplier_id: string | null;
      suppliers: { name: string } | null; products: { name: string; categories: { name: string } };
    }[]) {
      out.push({
        id: r.id,
        productName: r.products.name,
        categoryName: r.products.categories.name,
        sizeLabel: r.size_label,
        sku: r.sku,
        sourceRef: r.source_ref,
        costPence: r.cost_pence === null ? null : Number(r.cost_pence),
        vatBp: r.vat_rate_bp,
        supplierId: r.supplier_id,
        supplierName: r.suppliers?.name ?? null,
      });
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

/**
 * Preview or apply a cost file with the ADMIN'S OWN client: RLS applies and every changed size is audited under the
 * admin. The server re-reads and re-plans the file on apply; it never trusts a preview sent by the browser.
 */
export async function importCosts(_prev: CostImportState, formData: FormData): Promise<CostImportState> {
  await requireRole("admin");
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { csv, fileName, mode } = parsed.data;
  const read = readCostCsv(csv);
  if (!read.rows.length && read.errors.length && read.errors.every((e) => e.line <= 1)) return { error: read.errors[0].message, csv, fileName };

  const supabase = await createClient();
  try {
    const [variants, suppliers] = await Promise.all([
      loadVariants(supabase),
      supabase.from("suppliers").select("id, name").then((r) => r.data ?? []),
    ]);
    const plan = planCosts(read.rows, variants, suppliers);
    let updated = 0;
    if (mode === "apply" && plan.changes.length) {
      for (let i = 0; i < plan.changes.length; i += 500) {
        const chunk = plan.changes.slice(i, i + 500).map((c) => ({
          id: c.id,
          cost_pence: c.newCostPence,
          ...(c.vatBp !== undefined ? { vat_rate_bp: c.vatBp } : {}),
          ...(c.supplierId ? { supplier_id: c.supplierId } : {}),
        }));
        const { data, error } = await supabase.rpc("admin_set_variant_costs", { p_rows: chunk });
        if (error) throw new Error(error.message);
        updated += Number(data ?? 0);
      }
      catalogueChanged();
    }
    const result: CostImportResult = {
      applied: mode === "apply",
      rowCount: read.rows.length + read.blank + read.errors.filter((e) => e.line > 1).length,
      blank: read.blank,
      errors: read.errors,
      changes: plan.changes.slice(0, SHOWN),
      changeCount: plan.changes.length,
      unchanged: plan.unchanged,
      notFound: plan.notFound.slice(0, 100),
      ambiguous: plan.ambiguous.slice(0, 100),
      unknownSupplier: plan.unknownSupplier.slice(0, 100),
      repeated: plan.repeated.slice(0, 100),
      updated,
    };
    return { result, csv: result.applied ? undefined : csv, fileName };
  } catch (e) {
    console.error("cost import failed", (e as Error).message);
    return { error: "The import stopped part-way. Nothing already saved is lost; run the same file again to finish it.", csv, fileName };
  }
}
