import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PhotoForm } from "@/components/admin/photo-form";
import { CategoryArt } from "@/components/catalogue/category-art";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { clearCategoryImage, deleteCategory, setCategoryImage, updateCategory } from "../actions";
import { CategoryForm } from "../category-form";

export const metadata: Metadata = { title: "Edit category" };

export default async function CategoryPage({ params, searchParams }: PageProps<"/admin/categories/[id]">) {
  await requireRole("admin");
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: c }, { count }] = await Promise.all([
    supabase.from("categories").select("*").eq("id", id).maybeSingle(),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id),
  ]);
  if (!c) notFound();

  return (
    <>
      <Link href="/admin/categories" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Categories
      </Link>
      <PageHeader
        eyebrow="Category"
        title={c.name}
        description={`${count ?? 0} products`}
        actions={
          c.active ? (
            <Link href={`/catalogue?category=${c.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              View on site <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          ) : null
        }
      />
      {notice === "created" ? <Alert tone="success" className="mb-4">Category added. Add a photo, then put products in it.</Alert> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="self-start">
          <CardHeader title="Details" />
          <CardBody>
            <CategoryForm
              action={updateCategory.bind(null, c.id)}
              submitLabel="Save changes"
              initial={{ name: c.name, slug: c.slug, description: c.description ?? "", sort: c.sort, default_vat_rate_bp: c.default_vat_rate_bp, active: c.active }}
            />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Photo" description="Used on the home page and category tiles." />
            <CardBody>
              <PhotoForm
                imageUrl={publicImageUrl(c.image_path)}
                upload={setCategoryImage.bind(null, c.id)}
                remove={clearCategoryImage.bind(null, c.id)}
                placeholder={<CategoryArt slug={c.slug} className="size-full" />}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Delete" />
            <CardBody className="space-y-3 text-sm text-ink-muted">
              <p>Only empty categories can be deleted. To take a category off the site, untick &ldquo;Visible&rdquo; instead.</p>
              <ConfirmButton action={deleteCategory.bind(null, c.id)} confirm={`Delete the category "${c.name}"?`} icon={<Trash2 className="size-4" aria-hidden="true" />}>
                Delete category
              </ConfirmButton>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
