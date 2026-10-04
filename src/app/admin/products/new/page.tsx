import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage({ searchParams }: PageProps<"/admin/products/new">) {
  await requireRole("admin");
  const { category } = await searchParams;
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id, name, active").order("sort").order("name");
  return (
    <>
      <Link href="/admin/products" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Products
      </Link>
      <PageHeader eyebrow="Catalogue" title="New product" description="Add the product first; pack sizes, costs and a photo come next." />
      <Card className="max-w-2xl">
        <CardBody className="py-5">
          <ProductForm
            action={createProduct}
            submitLabel="Create product"
            categories={categories ?? []}
            showSlug={false}
            initial={{ name: "", slug: "", category_id: typeof category === "string" ? category : "", description: "", active: true }}
          />
        </CardBody>
      </Card>
    </>
  );
}
