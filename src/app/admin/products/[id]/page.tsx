import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PhotoForm } from "@/components/admin/photo-form";
import { CategoryArt } from "@/components/catalogue/category-art";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatTimestamp } from "@/domain/dates";
import { bpToInput, penceToInput } from "@/domain/money";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { clearProductImage, saveVariants, setProductImage, updateProduct } from "../actions";
import { ProductForm } from "../product-form";
import { SizesEditor } from "../sizes-editor";

export const metadata: Metadata = { title: "Edit product" };

export default async function ProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireRole("admin");
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: p }, { data: categories }, { data: suppliers }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "*, categories(name, slug, active, default_vat_rate_bp), product_variants(id, size_label, size_sort, supplier_id, cost_pence, vat_rate_bp, sku, active)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name, active").order("sort").order("name"),
    supabase.from("suppliers").select("id, name, active").order("name"),
  ]);
  if (!p) notFound();
  const variants = [...(p.product_variants ?? [])].sort((a, b) => a.size_sort - b.size_sort || a.size_label.localeCompare(b.size_label));
  const live = p.active && p.categories?.active;

  return (
    <>
      <Link href="/admin/products" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Products
      </Link>
      <PageHeader
        eyebrow={p.categories?.name ?? "Product"}
        title={p.name}
        actions={
          live ? (
            <Link href={`/catalogue/${p.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              View on site <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          ) : null
        }
      />
      {notice === "created" ? (
        <Alert tone="success" className="mb-4">
          Product created. Now add its pack sizes and costs.
        </Alert>
      ) : null}
      {!live ? (
        <Alert tone="warning" className="mb-4">
          Not on the site: {p.active ? "its category is hidden" : "this product is hidden"}.
        </Alert>
      ) : null}

      <div className="space-y-6">
        <Card>
          <CardHeader title="Pack sizes and costs" description="Cost is what you pay the supplier, before VAT. Restaurants never see it." />
          <CardBody>
            <SizesEditor
              action={saveVariants.bind(null, p.id)}
              suppliers={(suppliers ?? []).filter((s) => s.active || variants.some((v) => v.supplier_id === s.id))}
              defaultVat={bpToInput(p.categories?.default_vat_rate_bp ?? 0)}
              initial={variants.map((v) => ({
                id: v.id,
                size_label: v.size_label,
                supplier_id: v.supplier_id ?? "",
                cost: v.cost_pence == null ? "" : penceToInput(v.cost_pence),
                vat: bpToInput(v.vat_rate_bp),
                sku: v.sku ?? "",
                active: v.active,
              }))}
            />
          </CardBody>
        </Card>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Card className="min-w-0 self-start">
            <CardHeader title="Details" />
            <CardBody>
              <ProductForm
                action={updateProduct.bind(null, p.id)}
                submitLabel="Save details"
                categories={categories ?? []}
                initial={{ name: p.name, slug: p.slug, category_id: p.category_id, description: p.description ?? "", active: p.active }}
              />
            </CardBody>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader title="Photo" />
              <CardBody>
                <PhotoForm
                  imageUrl={publicImageUrl(p.image_path)}
                  upload={setProductImage.bind(null, p.id)}
                  remove={clearProductImage.bind(null, p.id)}
                  placeholder={<CategoryArt slug={p.categories?.slug ?? ""} className="size-full" />}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Record" />
              <CardBody>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Source</dt>
                    <dd className="text-right">{p.source === "admin" ? "Added by hand" : (p.source ?? "—")}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Created</dt>
                    <dd className="text-right">{formatTimestamp(p.created_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Updated</dt>
                    <dd className="text-right">{formatTimestamp(p.updated_at)}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
