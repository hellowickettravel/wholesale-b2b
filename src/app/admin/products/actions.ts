"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { extractSize, normaliseKey } from "@/lib/import/parse-name";
import { productRef } from "@/lib/import/plan";
import { createClient } from "@/lib/supabase/server";
import { productSchema, variantRowsFrom, variantSchema } from "@/lib/validation/catalogue";
import { echo, fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import { requireRole } from "@/server/auth";
import { catalogueChanged, freeSlug, removeImage, replaceImage } from "@/server/catalogue-admin";

const FIELDS = ["name", "slug", "category_id", "description", "active"];
const id = z.uuid();
const MAX_SIZES = 40;

export async function createProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const values = echo(formData, FIELDS);
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const input = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      slug: await freeSlug(supabase, "products", input.slug, input.name),
      category_id: input.category_id,
      description: input.description || null,
      active: input.active,
      source: "admin",
      // Same identity an import uses, so a later import adds sizes instead of a duplicate.
      source_ref: productRef(input.category_id, normaliseKey(input.name)),
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { fieldErrors: { name: ["A product with this name already exists in this category."] }, values };
    if (error.code === "23503") return { fieldErrors: { category_id: ["Choose a category."] }, values };
    return { error: "The product could not be created.", values };
  }
  catalogueChanged();
  redirect(`/admin/products/${data.id}?notice=created`);
}

export async function updateProduct(productId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(productId).success) return { error: "Not found." };
  const values = echo(formData, FIELDS);
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const input = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: input.name,
      slug: await freeSlug(supabase, "products", input.slug, input.name, productId),
      category_id: input.category_id,
      description: input.description || null,
      active: input.active,
    })
    .eq("id", productId);
  if (error) return { error: "The product could not be saved.", values };
  catalogueChanged(`/admin/products/${productId}`);
  return { notice: "Saved." };
}

/**
 * Save every size of a product in one go. Existing rows are matched by id AND product id, so
 * a tampered form cannot touch another product's sizes. Sizes are never deleted here (orders
 * may reference them); they are switched off instead.
 */
export async function saveVariants(productId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(productId).success) return { error: "Not found." };
  // Indexes match the form's v.<i> names, so errors land on the right row; blank new rows are skipped.
  const raw = variantRowsFrom(formData);
  if (raw.length > MAX_SIZES) return { error: `A product can have at most ${MAX_SIZES} sizes.` };

  const fieldErrors: Record<string, string[]> = {};
  const rows = raw.map((r, i) => {
    if (!r.id && !r.size_label?.trim()) return null;
    const parsed = variantSchema.safeParse({ ...r, active: r.active ?? "" });
    if (!parsed.success) {
      for (const [k, msgs] of Object.entries(fieldErrorsOf(parsed.error))) fieldErrors[`v.${i}.${k}`] = msgs;
      return null;
    }
    return parsed.data;
  });
  const seen = new Map<string, number>();
  rows.forEach((r, i) => {
    if (!r) return;
    const key = r.size_label.toLowerCase();
    if (seen.has(key)) fieldErrors[`v.${i}.size_label`] = ["This size is listed twice."];
    seen.set(key, i);
  });
  if (Object.keys(fieldErrors).length) return { error: "Check the highlighted sizes.", fieldErrors, values: flatValues(raw) };

  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("id").eq("id", productId).maybeSingle();
  if (!product) return { error: "Not found." };

  for (const r of rows) {
    if (!r) continue;
    const record = {
      size_label: r.size_label,
      size_sort: Math.min(2_000_000_000, Math.round(extractSize(r.size_label)?.sortKey ?? 0)),
      supplier_id: r.supplier_id || null,
      cost_pence: r.cost,
      vat_rate_bp: r.vat,
      sku: r.sku || null,
      active: r.active,
    };
    const { error } = r.id
      ? await supabase.from("product_variants").update(record).eq("id", r.id).eq("product_id", productId)
      : await supabase.from("product_variants").insert({ ...record, product_id: productId });
    if (error) {
      console.error("save variant failed", error.code, error.message);
      return {
        error: error.code === "23505" ? `"${r.size_label}" already exists for this product.` : "The sizes could not be saved. Please try again.",
        values: flatValues(raw),
      };
    }
  }
  catalogueChanged(`/admin/products/${productId}`);
  return { notice: "Sizes saved." };
}

function flatValues(rows: Record<string, string>[]): Record<string, string> {
  const out: Record<string, string> = {};
  rows.forEach((r, i) => {
    for (const [k, v] of Object.entries(r)) out[`v.${i}.${k}`] = v.slice(0, 200);
  });
  return out;
}

export async function setProductImage(productId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(productId).success) return { error: "Not found." };
  const { error } = await replaceImage(await createClient(), "products", productId, formData.get("photo"));
  if (error) return { error };
  catalogueChanged(`/admin/products/${productId}`);
  return { notice: "Photo updated." };
}

export async function clearProductImage(productId: string): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(productId).success) return { error: "Not found." };
  await removeImage(await createClient(), "products", productId);
  catalogueChanged(`/admin/products/${productId}`);
  return { notice: "Photo removed." };
}
