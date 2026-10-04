import { csvCell } from "@/lib/import/csv";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";

/** Admin download: every product that still needs a cost or a photo (owner's to-do list). */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin" || !viewer.active) return new Response("Forbidden", { status: 403 });
  const supabase = await createClient();
  const rows: { name: string | null; category_name: string | null; size_count: number | null; needs_price_count: number | null; image_path: string | null; active: boolean | null; supplier_names: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("admin_product_list")
      .select("name, category_name, size_count, needs_price_count, image_path, active, supplier_names")
      .or("needs_price_count.gt.0,image_path.is.null")
      .order("category_name")
      .order("name")
      .range(from, from + 999);
    if (error) return new Response("Could not build the list", { status: 500 });
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const lines = [
    ["category", "product", "sizes", "sizes_missing_price", "has_photo", "visible", "supplier"].join(","),
    ...rows.map((r) =>
      [r.category_name, r.name, r.size_count, r.needs_price_count, r.image_path ? "yes" : "no", r.active ? "yes" : "no", r.supplier_names].map(csvCell).join(","),
    ),
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-missing-price-or-photo.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
