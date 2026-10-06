import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileSpreadsheet, Plus, Search } from "lucide-react";
import { ProductImage } from "@/components/brand/product-image";
import { FilterChips } from "@/components/admin/filter-chips";
import { Badge } from "@/components/ui/badge";
import { buttonClasses, LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { EmptyNote } from "@/components/admin/empty-note";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { likePattern, searchWords } from "@/lib/catalogue/query";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 50;
const STATUSES = [
  { value: "", label: "All" },
  { value: "needs-price", label: "Needs price" },
  { value: "no-photo", label: "No photo" },
  { value: "hidden", label: "Hidden" },
] as const;
type Status = (typeof STATUSES)[number]["value"];

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireRole("admin");
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const category = /^[0-9a-f-]{36}$/.test(one(sp.category)) ? one(sp.category) : "";
  const status = (STATUSES.find((s) => s.value === one(sp.status))?.value ?? "") as Status;
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(sp.page), 10) || 1));
  const href = (p: { status?: Status; page?: number }) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (category) u.set("category", category);
    const st = p.status ?? status;
    if (st) u.set("status", st);
    if (p.page && p.page > 1) u.set("page", String(p.page));
    const s = u.toString();
    return s ? `/admin/products?${s}` : "/admin/products";
  };

  const supabase = await createClient();
  let query = supabase
    .from("admin_product_list")
    .select("id, name, slug, active, image_path, category_name, size_count, needs_price_count, supplier_names", { count: "exact" })
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  for (const w of searchWords(q)) query = query.ilike("name", likePattern(w));
  if (category) query = query.eq("category_id", category);
  if (status === "needs-price") query = query.gt("needs_price_count", 0);
  if (status === "no-photo") query = query.is("image_path", null);
  if (status === "hidden") query = query.eq("active", false);

  const counted = (f: (b: ReturnType<typeof base>) => ReturnType<typeof base>) => f(base()).then((r) => r.count ?? 0);
  const base = () => supabase.from("admin_product_list").select("id", { count: "exact", head: true });
  const [{ data, count }, { data: categories }, all, needsPrice, noPhoto, hidden] = await Promise.all([
    query,
    supabase.from("categories").select("id, name, slug").order("sort").order("name"),
    counted((b) => b),
    counted((b) => b.gt("needs_price_count", 0)),
    counted((b) => b.is("image_path", null)),
    counted((b) => b.eq("active", false)),
  ]);
  const totals: Record<Status, number> = { "": all, "needs-price": needsPrice, "no-photo": noPhoto, hidden };
  const rows = data ?? [];
  const slugByName = new Map((categories ?? []).map((c) => [c.name, c.slug]));
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Products"
        description="Everything restaurants can order. Sizes without a cost cannot be ordered until you add one."
        actions={
          <>
            <LinkButton
              href="/admin/products/missing.csv"
              variant="secondary"
              size="sm"
              icon={<Download className="size-4" aria-hidden="true" />}
              prefetch={false}
            >
              Missing price/photo
            </LinkButton>
            <LinkButton href="/admin/products/import" variant="secondary" size="sm" icon={<FileSpreadsheet className="size-4" aria-hidden="true" />}>
              Import CSV
            </LinkButton>
            <LinkButton href="/admin/products/new" size="sm" icon={<Plus className="size-4" aria-hidden="true" />}>
              New product
            </LinkButton>
          </>
        }
      />

      <FilterChips label="Filter by status" current={status} items={STATUSES.map((s) => ({ key: s.value, href: href({ status: s.value, page: 1 }), label: s.label, count: totals[s.value] }))} />

      <form action="/admin/products" className="mb-4 flex flex-col gap-2 sm:flex-row">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label htmlFor="products-q" className="sr-only">
          Search products
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <Input id="products-q" name="q" type="search" defaultValue={q} placeholder="Search by name" className="pl-9" />
        </div>
        <label htmlFor="products-category" className="sr-only">
          Category
        </label>
        <Select id="products-category" name="category" defaultValue={category} className="sm:w-56">
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonClasses({ className: "sm:h-10" })}>Filter</button>
      </form>

      <Card>
        {rows.length === 0 ? (
          <EmptyNote
            title={q || category || status ? "No products match" : "No products yet"}
            action={
              q || category || status ? (
                <LinkButton href="/admin/products" variant="secondary">
                  Clear filters
                </LinkButton>
              ) : (
                <LinkButton href="/admin/products/import">Import a CSV</LinkButton>
              )
            }
          >
            {q || category || status ? "Try another search or filter." : "Import the supplier lists, or add products one by one."}
          </EmptyNote>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Product</TH>
                <TH className="hidden md:table-cell">Category</TH>
                <TH className="text-right">Sizes</TH>
                <TH className="hidden sm:table-cell">Status</TH>
                <TH className="hidden lg:table-cell">Supplier</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <Link href={`/admin/products/${p.id}`} className="group flex items-center gap-3">
                      <ProductImage
                        src={publicImageUrl(p.image_path)}
                        alt=""
                        name={p.name ?? ""}
                        variant="thumb"
                        categorySlug={slugByName.get(p.category_name ?? "")}
                        className="size-11 rounded-[var(--radius-sm)]"
                        sizes="44px"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium group-hover:text-primary group-hover:underline">{p.name}</span>
                        <span className="block text-[13px] text-ink-muted md:hidden">{p.category_name}</span>
                        <span className="mt-1 block sm:hidden">
                          <StatusBadges p={p} />
                        </span>
                      </span>
                    </Link>
                  </TD>
                  <TD className="hidden text-ink-muted md:table-cell">{p.category_name}</TD>
                  <TD className="tabular text-right">{p.size_count}</TD>
                  <TD className="hidden sm:table-cell">
                    <StatusBadges p={p} />
                  </TD>
                  <TD className="hidden text-ink-muted lg:table-cell">{p.supplier_names ?? "—"}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefFor={(n) => href({ page: n })} />
    </>
  );
}

function StatusBadges({ p }: { p: { needs_price_count: number | null; size_count: number | null; image_path: string | null; active: boolean | null } }) {
  return (
    <span className="flex flex-wrap gap-1">
      {p.needs_price_count ? <Badge tone="warning">Needs price{p.size_count && p.size_count > 1 ? ` (${p.needs_price_count})` : ""}</Badge> : null}
      {!p.image_path ? <Badge tone="neutral">No photo</Badge> : null}
      {!p.active ? <Badge tone="neutral">Hidden</Badge> : null}
      {p.active && p.image_path && !p.needs_price_count ? <Badge tone="success">Ready</Badge> : null}
    </span>
  );
}
