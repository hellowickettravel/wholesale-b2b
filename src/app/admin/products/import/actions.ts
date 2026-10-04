"use server";
import { z } from "zod";
import { runImport, type ImportResult } from "@/lib/import/apply";
import { MAX_IMPORT_BYTES } from "@/lib/import/csv";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { catalogueChanged } from "@/server/catalogue-admin";

export interface ImportState {
  error?: string;
  result?: ImportResult;
  /** Echoed so the admin can confirm the exact same file after the preview. */
  csv?: string;
  fileName?: string;
  supplierId?: string;
  source?: string;
}

const input = z.object({
  csv: z.string().min(1, "Choose a CSV file.").max(MAX_IMPORT_BYTES, "The file is larger than 2 MB."),
  fileName: z.string().max(200).default(""),
  supplier_id: z.union([z.uuid(), z.literal("")]),
  new_supplier: z.string().trim().max(200).default(""),
  source: z
    .string()
    .trim()
    .max(40)
    .regex(/^[a-z0-9_-]*$/i, "Letters, numbers, - and _ only.")
    .default(""),
  mode: z.enum(["preview", "import"]),
});

/**
 * Preview (dry run) or run a catalogue import with the ADMIN'S OWN client: RLS applies and
 * every inserted row is audited under the admin. Costs are never imported.
 */
export async function importCatalogue(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireRole("admin");
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { csv, fileName, mode, new_supplier } = parsed.data;
  const source = parsed.data.source || "csv";
  const supabase = await createClient();

  let supplierId = parsed.data.supplier_id;
  if (!supplierId && !new_supplier) return { error: "Choose the supplier for these products, or enter a new supplier name.", csv, fileName, source };
  if (!supplierId && mode === "import") {
    const { data: existing } = await supabase.from("suppliers").select("id").ilike("name", new_supplier.replace(/[\\%_]/g, "\\$&")).limit(1);
    if (existing?.length) supplierId = existing[0].id;
    else {
      const { data, error } = await supabase.from("suppliers").insert({ name: new_supplier }).select("id").single();
      if (error) return { error: "The supplier could not be created.", csv, fileName, source };
      supplierId = data.id;
    }
  }

  try {
    const result = await runImport(supabase, csv, { source, supplierId: supplierId || null, dryRun: mode === "preview" });
    if (result.applied) catalogueChanged();
    return { result, csv: result.applied ? undefined : csv, fileName, supplierId, source };
  } catch (e) {
    console.error("catalogue import failed", (e as Error).message);
    return {
      error: "The import stopped part-way. Nothing already saved is lost; run the same file again to finish it.",
      csv,
      fileName,
      source,
    };
  }
}
