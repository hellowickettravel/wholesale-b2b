import type { Metadata } from "next";
import { FilterChips } from "@/components/admin/filter-chips";
import Link from "next/link";
import { Plus, Send } from "lucide-react";
import { FilterBar, FilterDates, FilterSearch, FilterSelect } from "@/components/admin/filter-bar";
import { CUSTOMER_STATUS, CustomerStatusBadge } from "@/components/admin/customer-status";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyNote } from "@/components/admin/empty-note";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/domain/dates";
import { likePattern, searchWords } from "@/lib/catalogue/query";
import { choiceParam, dateParam, dayRange, listHref } from "@/lib/list-params";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 50;
const TABS = ["", "pending", "approved", "suspended", "rejected"] as const;
type Tab = (typeof TABS)[number];
const SORTS = [
  { value: "name", label: "Name A to Z" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const;

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireRole("admin");
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const status = (TABS.find((t) => t === one(sp.status)) ?? "") as Tab;
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(sp.page), 10) || 1));
  const from = dateParam(sp, "from");
  const to = dateParam(sp, "to");
  const sort = choiceParam(sp, "sort", SORTS.map((s) => s.value));
  const filtered = Boolean(q || from || to || sort !== "name");
  const href = (p: { status?: Tab; page?: number }) =>
    listHref("/admin/customers", { q, status: p.status ?? status, from, to, sort: sort === "name" ? "" : sort, page: p.page });

  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id, business_name, contact_name, email, city, postcode, status, created_at, customer_category_access(count), profiles(count)", { count: "exact" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  query = sort === "name" ? query.order("business_name") : query.order("created_at", { ascending: sort === "oldest" });
  if (status) query = query.eq("status", status);
  const range = dayRange(from, to);
  if (range.gte) query = query.gte("created_at", range.gte);
  if (range.lte) query = query.lte("created_at", range.lte);
  for (const w of searchWords(q)) query = query.or(`business_name.ilike.${likePattern(w)},contact_name.ilike.${likePattern(w)},email.ilike.${likePattern(w)},postcode.ilike.${likePattern(w)}`);

  const counts = await Promise.all(
    TABS.map(async (t) => {
      let c = supabase.from("customers").select("id", { count: "exact", head: true });
      if (t) c = c.eq("status", t);
      return (await c).count ?? 0;
    }),
  );
  const { data, count } = await query;
  const rows = data ?? [];
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Restaurants"
        description="Every trade account: who they are, whether they can order, and how many categories they see."
        actions={
          <>
            <LinkButton href="/admin/customers/new?invite=1" size="sm" variant="accent" icon={<Send className="size-4" aria-hidden="true" />}>Invite a customer</LinkButton>
            <LinkButton href="/admin/customers/new" size="sm" variant="secondary" icon={<Plus className="size-4" aria-hidden="true" />}>Add customer</LinkButton>
          </>
        }
      />
      <FilterChips label="Filter by status" current={status} items={TABS.map((t, i) => ({ key: t, href: href({ status: t, page: 1 }), label: t ? CUSTOMER_STATUS[t].label : "All", count: counts[i] }))} />
      <FilterBar action="/admin/customers" hidden={{ status }} clearHref={listHref("/admin/customers", { status })} active={filtered}>
        <FilterSearch id="customers-q" label="Search" defaultValue={q} placeholder="Name, contact, email or postcode" />
        <FilterDates idPrefix="customers" label="Joined" from={from} to={to} />
        <FilterSelect id="customers-sort" name="sort" label="Sort" defaultValue={sort} options={SORTS} />
      </FilterBar>
      <Card>
        {rows.length === 0 ? (
          <EmptyNote title={filtered || status ? "No customers match" : "No customers yet"} action={<LinkButton href="/admin/customers/new">Add a customer</LinkButton>}>
            {filtered || status ? "Try another search, date or status." : "Restaurants appear here when they register or when you add them."}
          </EmptyNote>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Restaurant</TH>
                <TH className="hidden sm:table-cell">Status</TH>
                <TH className="hidden text-right md:table-cell">Categories</TH>
                <TH className="hidden text-right md:table-cell">Logins</TH>
                <TH className="hidden lg:table-cell">Since</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/admin/customers/${c.id}`} className="group block">
                      <span className="block font-medium group-hover:text-primary group-hover:underline">{c.business_name}</span>
                      <span className="block break-all text-[13px] text-ink-muted">{[c.contact_name, c.postcode ?? c.city].filter(Boolean).join(", ") || c.email || "—"}</span>
                      <span className="mt-1 block sm:hidden"><CustomerStatusBadge status={c.status} /></span>
                    </Link>
                  </TD>
                  <TD className="hidden sm:table-cell"><CustomerStatusBadge status={c.status} /></TD>
                  <TD className="tabular hidden text-right md:table-cell">{c.customer_category_access?.[0]?.count ?? 0}</TD>
                  <TD className="tabular hidden text-right md:table-cell">{c.profiles?.[0]?.count ?? 0}</TD>
                  <TD className="hidden whitespace-nowrap text-ink-muted lg:table-cell">{formatDate(c.created_at)}</TD>
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
