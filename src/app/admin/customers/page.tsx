import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { CUSTOMER_STATUS, CustomerStatusBadge } from "@/components/admin/customer-status";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/domain/dates";
import { likePattern, searchWords } from "@/lib/catalogue/query";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 50;
const TABS = ["", "pending", "approved", "suspended", "rejected"] as const;
type Tab = (typeof TABS)[number];

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireRole("admin");
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const status = (TABS.find((t) => t === one(sp.status)) ?? "") as Tab;
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(sp.page), 10) || 1));
  const href = (p: { status?: Tab; page?: number }) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    const st = p.status ?? status;
    if (st) u.set("status", st);
    if (p.page && p.page > 1) u.set("page", String(p.page));
    const s = u.toString();
    return s ? `/admin/customers?${s}` : "/admin/customers";
  };

  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id, business_name, contact_name, email, city, postcode, status, created_at, customer_category_access(count), profiles(count)", { count: "exact" })
    .order("business_name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
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
      <PageHeader
        eyebrow="Customers"
        title="Restaurants"
        description="Every trade account: who they are, whether they can order, and how many categories they see."
        actions={<LinkButton href="/admin/customers/new" size="sm" icon={<Plus className="size-4" aria-hidden="true" />}>Add customer</LinkButton>}
      />
      <nav aria-label="Filter by status" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t, i) => (
          <Link
            key={t || "all"}
            href={href({ status: t, page: 1 })}
            aria-current={status === t ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              status === t ? "border-primary bg-primary text-primary-ink" : "border-line-strong bg-raised text-ink hover:bg-sunken",
            )}
          >
            {t ? CUSTOMER_STATUS[t].label : "All"}
            <span className={cn("tabular text-xs", status === t ? "opacity-80" : "text-ink-subtle")}>{counts[i]}</span>
          </Link>
        ))}
      </nav>
      <form action="/admin/customers" className="mb-4 flex gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label htmlFor="customers-q" className="sr-only">Search customers</label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <input id="customers-q" name="q" type="search" defaultValue={q} placeholder="Search name, contact, email or postcode" className="block h-10 w-full rounded-[var(--radius-md)] border border-line-strong bg-raised pl-9 pr-3 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <button type="submit" className="h-10 rounded-[var(--radius-md)] bg-primary px-4 text-sm font-semibold text-primary-ink hover:bg-primary-strong">Search</button>
      </form>
      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={<Users />} title={q || status ? "No customers match" : "No customers yet"} action={<LinkButton href="/admin/customers/new">Add a customer</LinkButton>}>
            {q || status ? "Try another search or status." : "Restaurants appear here when they register or when you add them."}
          </EmptyState>
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
                      <span className="block break-all text-[13px] text-ink-muted">{[c.contact_name, c.postcode ?? c.city].filter(Boolean).join(" · ") || c.email || "—"}</span>
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
