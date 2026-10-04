import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { uniqueSlug } from "@/lib/import/plan";
import { slugify } from "@/lib/import/parse-name";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/storage";
import type { createClient } from "@/lib/supabase/server";
import { CATALOGUE_TAG } from "@/server/catalogue";
import { checkImage } from "@/server/images";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Helpers for admin catalogue actions. Every caller has already run requireRole("admin") and
 * passes the admin's OWN client, so RLS still applies and the audit log names the admin.
 */

/** Expire the public catalogue cache and the admin lists after any catalogue change. */
export function catalogueChanged(...paths: string[]) {
  updateTag(CATALOGUE_TAG);
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  for (const p of paths) revalidatePath(p);
}

/** The requested slug (or one made from the name) made unique within the table. */
export async function freeSlug(supabase: Client, table: "categories" | "products", wanted: string, name: string, exceptId?: string) {
  const base = slugify(wanted || name) || "item";
  let query = supabase.from(table).select("slug").like("slug", `${base}%`).limit(1000);
  if (exceptId) query = query.neq("id", exceptId);
  const { data } = await query;
  return uniqueSlug(base, new Set((data ?? []).map((r) => r.slug)));
}

/**
 * Upload a checked photo to product-images/<folder>/<id>/<random>.<ext>, point the row at it,
 * then remove the previous file. A new name each time means no stale CDN copies.
 */
export async function replaceImage(
  supabase: Client,
  table: "categories" | "products",
  id: string,
  file: FormDataEntryValue | null,
): Promise<{ error?: string }> {
  const checked = await checkImage(file);
  if ("error" in checked) return { error: checked.error };
  const { data: row } = await supabase.from(table).select("image_path").eq("id", id).maybeSingle();
  if (!row) return { error: "Not found." };

  const path = `${table}/${id}/${crypto.randomUUID()}.${checked.ext}`;
  const bucket = supabase.storage.from(PRODUCT_IMAGES_BUCKET);
  const up = await bucket.upload(path, checked.bytes, { contentType: checked.contentType, upsert: false, cacheControl: "31536000" });
  if (up.error) {
    console.error("image upload failed", up.error.message);
    return { error: "The photo could not be uploaded. Please try again." };
  }
  const { error } = await supabase.from(table).update({ image_path: path }).eq("id", id);
  if (error) {
    await bucket.remove([path]);
    return { error: "The photo could not be saved. Please try again." };
  }
  if (row.image_path) await bucket.remove([row.image_path]);
  return {};
}

export async function removeImage(supabase: Client, table: "categories" | "products", id: string) {
  const { data: row } = await supabase.from(table).select("image_path").eq("id", id).maybeSingle();
  if (!row?.image_path) return;
  const { error } = await supabase.from(table).update({ image_path: null }).eq("id", id);
  if (!error) await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([row.image_path]);
}
