"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation/catalogue";
import { echo, fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import { requireRole } from "@/server/auth";
import { catalogueChanged, freeSlug, removeImage, replaceImage } from "@/server/catalogue-admin";

const FIELDS = ["name", "slug", "description", "sort", "default_vat", "active"];
const id = z.uuid();

export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const values = echo(formData, FIELDS);
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const input = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: input.name,
      slug: await freeSlug(supabase, "categories", input.slug, input.name),
      description: input.description || null,
      sort: input.sort,
      default_vat_rate_bp: input.default_vat,
      active: input.active,
    })
    .select("id")
    .single();
  if (error) return { error: "The category could not be created.", values };
  catalogueChanged();
  redirect(`/admin/categories/${data.id}?notice=created`);
}

export async function updateCategory(categoryId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(categoryId).success) return { error: "Not found." };
  const values = echo(formData, FIELDS);
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const input = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name: input.name,
      slug: await freeSlug(supabase, "categories", input.slug, input.name, categoryId),
      description: input.description || null,
      sort: input.sort,
      default_vat_rate_bp: input.default_vat,
      active: input.active,
    })
    .eq("id", categoryId);
  if (error) return { error: "The category could not be saved.", values };
  catalogueChanged(`/admin/categories/${categoryId}`);
  return { notice: "Saved." };
}

export async function deleteCategory(categoryId: string): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(categoryId).success) return { error: "Not found." };
  const supabase = await createClient();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", categoryId);
  if (count) return { error: "Move or delete its products first. You can also hide the category instead." };
  await removeImage(supabase, "categories", categoryId);
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { error: "The category could not be deleted." };
  catalogueChanged();
  redirect("/admin/categories?notice=deleted");
}

export async function setCategoryImage(categoryId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(categoryId).success) return { error: "Not found." };
  const supabase = await createClient();
  const { error } = await replaceImage(supabase, "categories", categoryId, formData.get("photo"));
  if (error) return { error };
  catalogueChanged(`/admin/categories/${categoryId}`);
  return { notice: "Photo updated." };
}

export async function clearCategoryImage(categoryId: string): Promise<FormState> {
  await requireRole("admin");
  if (!id.safeParse(categoryId).success) return { error: "Not found." };
  await removeImage(await createClient(), "categories", categoryId);
  catalogueChanged(`/admin/categories/${categoryId}`);
  return { notice: "Photo removed." };
}
