import type { Metadata } from "next";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyNote } from "@/components/admin/empty-note";
import { Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { formatTimestamp } from "@/domain/dates";
import { changedKeys, describeAuditRow, type AuditEntry } from "@/lib/audit-format";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;
const ENTITIES: Record<string, string> = {
  orders: "Orders",
  order_items: "Order lines",
  supplier_orders: "Supplier parts",
  customer_payments: "Restaurant payments",
  supplier_payments: "Supplier payments",
  delivery_proofs: "Driver links and proofs",
  invoices: "Invoices",
  customers: "Customers",
  customer_private: "Customer notes and margins",
  customer_category_access: "Customer categories",
  customer_category_margins: "Category margins",
  customer_product_rules: "Product rules",
  customer_price_overrides: "Fixed prices",
  product_variants: "Product sizes and costs",
  products: "Products",
  categories: "Categories",
  suppliers: "Suppliers",
  profiles: "Logins and roles",
  settings: "Settings",
};
const LINK: Record<string, string> = { orders: "/admin/orders/", customers: "/admin/customers/", suppliers: "/admin/suppliers/", products: "/admin/products/", categories: "/admin/categories/" };
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function show(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
}

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireRole("admin");
  const sp = await searchParams;
  const entity = one(sp.entity) in ENTITIES ? one(sp.entity) : "";
  const from = isoDate.test(one(sp.from)) ? one(sp.from) : "";
  const to = isoDate.test(one(sp.to)) ? one(sp.to) : "";
  const record = /^[0-9a-f-]{36}$/.test(one(sp.id)) ? one(sp.id) : "";
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(sp.page), 10) || 1));
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (entity) u.set("entity", entity);
    if (from) u.set("from", from);
    if (to) u.set("to", to);
    if (record) u.set("id", record);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `/admin/audit?${s}` : "/admin/audit";
  };

  const supabase = await createClient();
  let query = supabase.from("audit_log").select("*", { count: "exact" }).order("at", { ascending: false }).order("id", { ascending: false });
  if (entity) query = query.eq("entity", entity);
  if (record) query = query.eq("entity_id", record);
  if (from) query = query.gte("at", `${from}T00:00:00Z`);
  if (to) query = query.lte("at", `${to}T23:59:59Z`);
  const { data, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as AuditEntry[];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((x): x is string => Boolean(x)))];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, full_name, email, role").in("id", actorIds) : { data: [] };
  const who = (id: string | null, ent: string) => {
    if (!id) return ent === "delivery_proofs" ? "Driver (link)" : "System";
    const a = (actors ?? []).find((x) => x.id === id);
    return a ? `${a.full_name || a.email}${a.role !== "admin" ? ` (${a.role === "customer" ? "restaurant" : a.role})` : ""}` : "Unknown user";
  };
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Audit log" description="Who changed what, and when: prices, costs, payments, orders, accounts and settings. Read-only." />
      <form action="/admin/audit" className="mb-4 grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,1fr))_auto]">
        {record ? <input type="hidden" name="id" value={record} /> : null}
        <div>
          <label htmlFor="audit-entity" className="sr-only">What changed</label>
          <Select id="audit-entity" name="entity" defaultValue={entity}>
            <option value="">Everything</option>
            {Object.entries(ENTITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="audit-from" className="mb-1 block text-sm font-semibold text-ink">From</label>
          <Input id="audit-from" name="from" type="date" defaultValue={from} />
        </div>
        <div>
          <label htmlFor="audit-to" className="mb-1 block text-sm font-semibold text-ink">To</label>
          <Input id="audit-to" name="to" type="date" defaultValue={to} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className={buttonClasses({ className: "flex-1 sm:h-10 sm:flex-none" })}>Filter</button>
          {entity || from || to || record ? <Link href="/admin/audit" className={buttonClasses({ variant: "ghost", className: "sm:h-10" })}>Clear</Link> : null}
        </div>
      </form>

      <Card>
        {rows.length === 0 ? (
          <EmptyNote title="Nothing logged here">Changes appear here as they happen.</EmptyNote>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const keys = r.action === "update" ? changedKeys(r.before, r.after) : [];
              const before = (r.before ?? {}) as Record<string, unknown>;
              const after = (r.after ?? {}) as Record<string, unknown>;
              const link = r.entity_id && LINK[r.entity] ? `${LINK[r.entity]}${r.entity_id}` : null;
              return (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-sm font-medium text-ink">
                      {describeAuditRow(r, ENTITIES[r.entity])}
                      {link ? <>, <Link href={link} className="text-primary underline underline-offset-2">open</Link></> : null}
                    </p>
                    <p className="text-xs text-ink-muted">{formatTimestamp(r.at)}, {who(r.actor_id, r.entity)}</p>
                  </div>
                  {keys.length || r.action !== "update" ? (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs font-semibold text-ink-muted">Details</summary>
                      <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[12rem_minmax(0,1fr)]">
                        {(keys.length ? keys : Object.keys(r.action === "insert" ? after : before).filter((k) => k !== "updated_at")).map((k) => (
                          <div key={k} className="contents">
                            <dt className="font-semibold text-ink-muted">{k}</dt>
                            <dd className="break-all text-ink">
                              {r.action === "update" ? <><span className="text-ink-muted line-through">{show(before[k])}</span> → {show(after[k])}</> : show(r.action === "insert" ? after[k] : before[k])}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefFor={href} />
    </>
  );
}
