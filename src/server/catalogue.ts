import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { CATALOGUE_PAGE_SIZE, likePattern } from "@/lib/catalogue/query";
import type { Database } from "@/lib/database.types";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Public catalogue data. Reads go through a cookie-less ANON client, so RLS limits them to
 * active categories, products and the cost-free catalogue_variants view: this module cannot
 * return a price even by mistake. Results are cached under the "catalogue" tag; admin edits
 * call updateTag(CATALOGUE_TAG).
 */
export const CATALOGUE_TAG = "catalogue";
const REVALIDATE = 3600;

function anonClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imagePath: string | null;
  productCount: number;
}

export interface PublicProductCard {
  id: string;
  name: string;
  slug: string;
  imagePath: string | null;
  category: { name: string; slug: string; imagePath: string | null };
  sizes: string[];
}

export interface PublicProduct extends PublicProductCard {
  description: string | null;
  variants: { id: string; sizeLabel: string; sku: string | null }[];
}

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  image_path: string | null;
  description?: string | null;
  categories: { name: string; slug: string; image_path: string | null } | null;
};

const CARD_COLUMNS = "id, name, slug, image_path, categories!inner(name, slug, image_path, sort)";

async function variantsFor(ids: string[]) {
  if (ids.length === 0) return new Map<string, { id: string; size_label: string; sku: string | null }[]>();
  const { data, error } = await anonClient()
    .from("catalogue_variants")
    .select("id, product_id, size_label, size_sort, sku")
    .in("product_id", ids)
    .order("size_sort")
    .order("size_label");
  if (error) throw new Error(`catalogue variants: ${error.message}`);
  const map = new Map<string, { id: string; size_label: string; sku: string | null }[]>();
  for (const v of data ?? []) {
    if (!v.product_id || !v.id || !v.size_label) continue;
    const list = map.get(v.product_id) ?? [];
    list.push({ id: v.id, size_label: v.size_label, sku: v.sku });
    map.set(v.product_id, list);
  }
  return map;
}

function toCard(p: ProductRow, sizes: string[]): PublicProductCard {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    imagePath: p.image_path,
    category: { name: p.categories?.name ?? "", slug: p.categories?.slug ?? "", imagePath: p.categories?.image_path ?? null },
    sizes,
  };
}

export const getPublicCategories = unstable_cache(
  async (): Promise<PublicCategory[]> => {
    const client = anonClient();
    const [{ data: cats, error }, { data: prods, error: e2 }] = await Promise.all([
      client.from("categories").select("id, name, slug, description, image_path").order("sort").order("name"),
      client.from("products").select("category_id").limit(10000),
    ]);
    if (error || e2) throw new Error(`catalogue categories: ${(error ?? e2)!.message}`);
    const counts = new Map<string, number>();
    for (const p of prods ?? []) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
    return (cats ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imagePath: c.image_path,
      productCount: counts.get(c.id) ?? 0,
    }));
  },
  ["public-categories"],
  { tags: [CATALOGUE_TAG], revalidate: REVALIDATE },
);

export const searchPublicProducts = unstable_cache(
  async (category: string | null, words: string[], page: number) => {
    let query = anonClient()
      .from("products")
      .select(CARD_COLUMNS, { count: "exact" })
      // Category order first (Rice before packaging), then A–Z; id keeps pages stable.
      .order("categories(sort)")
      .order("name")
      .order("id")
      .range((page - 1) * CATALOGUE_PAGE_SIZE, page * CATALOGUE_PAGE_SIZE - 1);
    if (category) query = query.eq("categories.slug", category);
    for (const w of words) query = query.ilike("name", likePattern(w));
    const { data, error, count } = await query;
    // PostgREST answers 416 when the page is past the end; treat it as an empty page.
    if (error && error.code !== "PGRST103") throw new Error(`catalogue search: ${error.message}`);
    const rows = (data ?? []) as unknown as ProductRow[];
    const variants = await variantsFor(rows.map((r) => r.id));
    const total = count ?? 0;
    return {
      items: rows.map((r) => toCard(r, (variants.get(r.id) ?? []).map((v) => v.size_label))),
      total,
      pageCount: Math.max(1, Math.ceil(total / CATALOGUE_PAGE_SIZE)),
    };
  },
  ["public-search"],
  { tags: [CATALOGUE_TAG], revalidate: REVALIDATE },
);

export const getPublicProduct = unstable_cache(
  async (slug: string): Promise<{ product: PublicProduct; related: PublicProductCard[] } | null> => {
    const client = anonClient();
    const { data, error } = await client
      .from("products")
      .select("id, name, slug, image_path, description, category_id, categories!inner(name, slug, image_path)")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`catalogue product: ${error.message}`);
    if (!data) return null;
    const row = data as unknown as ProductRow & { category_id: string };
    const { data: relatedRows, error: e2 } = await client
      .from("products")
      .select(CARD_COLUMNS)
      .eq("category_id", row.category_id)
      .neq("id", row.id)
      .order("name")
      .limit(8);
    if (e2) throw new Error(`catalogue related: ${e2.message}`);
    const related = (relatedRows ?? []) as unknown as ProductRow[];
    const variants = await variantsFor([row.id, ...related.map((r) => r.id)]);
    const own = variants.get(row.id) ?? [];
    return {
      product: {
        ...toCard(row, own.map((v) => v.size_label)),
        description: row.description ?? null,
        variants: own.map((v) => ({ id: v.id, sizeLabel: v.size_label, sku: v.sku })),
      },
      related: related.map((r) => toCard(r, (variants.get(r.id) ?? []).map((v) => v.size_label))),
    };
  },
  ["public-product"],
  { tags: [CATALOGUE_TAG], revalidate: REVALIDATE },
);
