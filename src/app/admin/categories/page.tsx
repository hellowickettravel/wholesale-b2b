import type { Metadata } from "next";
import Link from "next/link";
import { CategoryArt } from "@/components/catalogue/category-art";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatBp } from "@/domain/money";
import { categoryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { createCategory } from "./actions";
import { CategoryForm } from "./category-form";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireRole("admin");
  const { notice } = await searchParams;
  const supabase = await createClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id, name, slug, sort, active, image_path, default_vat_rate_bp").order("sort").order("name"),
    supabase.from("products").select("category_id").limit(20000),
  ]);
  const counts = new Map<string, number>();
  for (const p of products ?? []) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
  const nextSort = (categories ?? []).reduce((m, c) => Math.max(m, c.sort), 0) + 1;

  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Categories" description="How the catalogue is grouped for restaurants and on the public site." />
      {notice === "deleted" ? <Alert tone="success" className="mb-4">Category deleted.</Alert> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader title="All categories" description={`${categories?.length ?? 0} categories`} />
          <Table>
            <THead>
              <tr>
                <TH>Category</TH>
                <TH className="text-right">Products</TH>
                <TH className="hidden sm:table-cell">Default VAT</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <tbody>
              {(categories ?? []).map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/admin/categories/${c.id}`} className="group flex items-center gap-3">
                      <CategoryArt slug={c.slug} imageUrl={categoryImageUrl(c.slug, c.image_path)} className="size-10 shrink-0 rounded-[var(--radius-sm)]" iconClassName="size-5" sizes="40px" />
                      <span className="min-w-0">
                        <span className="block font-medium group-hover:text-primary group-hover:underline">{c.name}</span>
                        <span className="block text-[13px] text-ink-muted">/{c.slug}</span>
                      </span>
                    </Link>
                  </TD>
                  <TD className="tabular text-right">
                    <Link href={`/admin/products?category=${c.id}`} className="hover:text-primary hover:underline">{counts.get(c.id) ?? 0}</Link>
                  </TD>
                  <TD className="hidden text-ink-muted sm:table-cell">{formatBp(c.default_vat_rate_bp)}</TD>
                  <TD>{c.active ? <Badge tone="success">Visible</Badge> : <Badge tone="neutral">Hidden</Badge>}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card className="self-start">
          <CardHeader title="Add a category" />
          <CardBody>
            <CategoryForm
              action={createCategory}
              submitLabel="Add category"
              initial={{ name: "", slug: "", description: "", sort: nextSort, default_vat_rate_bp: 0, active: true }}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
