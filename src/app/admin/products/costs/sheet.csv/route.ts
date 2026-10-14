import { csvCell } from "@/lib/import/csv";
import { penceToInput, bpToInput } from "@/domain/money";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";

/**
 * Admin download: a price sheet with one row per size. Fill in the "cost" column (pounds, before VAT) and upload it
 * on the Import costs screen. `?only=missing` lists just the sizes that have no cost yet.
 */
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin" || !viewer.active) return new Response("Forbidden", { status: 403 });
  const onlyMissing = new URL(request.url).searchParams.get("only") === "missing";
  const supabase = await createClient();
  type Row = { id: string; size_label: string; sku: string | null; cost_pence: number | null; vat_rate_bp: number; suppliers: { name: string } | null; products: { name: string; categories: { name: string; sort: number } } };
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase
      .from("product_variants")
      .select("id, size_label, sku, cost_pence, vat_rate_bp, suppliers(name), products!inner(name, categories!inner(name, sort))")
      .order("id")
      .range(from, from + 999);
    if (onlyMissing) q = q.is("cost_pence", null);
    const { data, error } = await q;
    if (error) return new Response("Could not build the sheet", { status: 500 });
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) break;
  }
  rows.sort((a, b) => a.products.categories.sort - b.products.categories.sort || a.products.name.localeCompare(b.products.name) || a.size_label.localeCompare(b.size_label, undefined, { numeric: true }));
  const lines = [
    ["category", "product", "size", "supplier", "sku", "cost", "vat", "variant_id"].join(","),
    ...rows.map((r) =>
      [r.products.categories.name, r.products.name, r.size_label, r.suppliers?.name ?? "", r.sku ?? "", r.cost_pence === null ? "" : penceToInput(Number(r.cost_pence)), bpToInput(r.vat_rate_bp), r.id]
        .map(csvCell)
        .join(","),
    ),
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="price-sheet${onlyMissing ? "-missing-costs" : ""}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
