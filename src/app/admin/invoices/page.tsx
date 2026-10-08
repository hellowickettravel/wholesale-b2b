import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyNote } from "@/components/admin/empty-note";
import { FilterBar, FilterDates, FilterSearch, FilterSelect } from "@/components/admin/filter-bar";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/domain/dates";
import { invoiceRef, orderRef } from "@/domain/status";
import { likePattern } from "@/lib/catalogue/query";
import { choiceParam, dateParam, dayRange, listHref } from "@/lib/list-params";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Invoices" };
const PAGE_SIZE = 50;
const STATES = [
  { value: "", label: "All invoices" },
  { value: "current", label: "Current" },
  { value: "void", label: "Void" },
] as const;

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function AdminInvoicesPage({ searchParams }: PageProps<"/admin/invoices">) {
  await requireRole("admin");
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(sp.page), 10) || 1));
  const from = dateParam(sp, "from");
  const to = dateParam(sp, "to");
  const state = choiceParam(sp, "state", STATES.map((s) => s.value));
  const filtered = Boolean(q || from || to || state);
  const supabase = await createClient();


  let customerIds: string[] | null = null;
  const num = /^(?:inv-)?0*(\d{1,9})$/i.exec(q);
  if (q && !num) {
    const { data } = await supabase.from("customers").select("id").ilike("business_name", likePattern(q)).limit(200);
    customerIds = (data ?? []).map((c) => c.id);
  }
  let query = supabase
    .from("invoices")
    .select("id, number, issued_at, voided_at, total_pence, order_id, customer_id, customers(business_name)", { count: "exact" })
    .order("number", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (num) query = query.eq("number", Number(num[1]));
  if (customerIds) query = query.in("customer_id", customerIds.length ? customerIds : ["00000000-0000-0000-0000-000000000000"]);
  if (state === "current") query = query.is("voided_at", null);
  if (state === "void") query = query.not("voided_at", "is", null);
  const range = dayRange(from, to);
  if (range.gte) query = query.gte("issued_at", range.gte);
  if (range.lte) query = query.lte("issued_at", range.lte);
  const { data, count } = await query;
  const rows = data ?? [];
  const { data: orders } = rows.length
    ? await supabase.from("admin_order_summary").select("id, number, payment_state").in("id", rows.map((r) => r.order_id))
    : { data: [] };
  const order = new Map((orders ?? []).map((o) => [o.id, o]));
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (p: number) => listHref("/admin/invoices", { q, from, to, state, page: p });

  return (
    <>
      <PageHeader title="Invoices" description="Every invoice, numbered without gaps. An invoice follows its order until the first delivery; a cancelled order's invoice is void." />
      <FilterBar action="/admin/invoices" clearHref="/admin/invoices" active={filtered}>
        <FilterSearch id="invoices-q" label="Search" defaultValue={q} placeholder="Invoice number or restaurant" />
        <FilterDates idPrefix="invoices" label="Issued" from={from} to={to} />
        <FilterSelect id="invoices-state" name="state" label="Status" defaultValue={state} options={STATES} />
      </FilterBar>
      <Card>
        {rows.length === 0 ? (
          <EmptyNote title={filtered ? "No invoices match" : "No invoices yet"}>
            {filtered ? "Try another number, name, date or status." : "An invoice is made for every order."}
          </EmptyNote>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Invoice</TH>
                <TH className="hidden sm:table-cell">Order</TH>
                <TH className="text-right">Total</TH>
                <TH className="hidden md:table-cell">Payment</TH>
                <TH><span className="sr-only">PDF</span></TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((r) => {
                const o = order.get(r.order_id);
                return (
                  <TR key={r.id}>
                    <TD>
                      <span className="flex flex-wrap items-center gap-2 font-semibold">{invoiceRef(r.number)}{r.voided_at ? <Badge tone="neutral">Void</Badge> : null}</span>
                      <span className="block text-[13px] text-ink-muted">{r.customers?.business_name}, {formatDate(r.issued_at)}</span>
                    </TD>
                    <TD className="hidden sm:table-cell">{o ? <Link href={`/admin/orders/${r.order_id}`} className="font-medium text-primary hover:underline">{orderRef(o.number!)}</Link> : "—"}</TD>
                    <TD className="text-right"><Money pence={r.total_pence} /></TD>
                    <TD className="hidden md:table-cell">{r.voided_at ? null : <PaymentBadge state={o?.payment_state} />}</TD>
                    <TD className="text-right">
                      <a href={`/api/invoices/${r.id}/pdf`} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                        <Download className="size-4" aria-hidden="true" />PDF<span className="sr-only"> of {invoiceRef(r.number)}</span>
                      </a>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefFor={href} />
    </>
  );
}
