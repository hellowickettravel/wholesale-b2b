import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyNote } from "@/components/admin/empty-note";
import { Input } from "@/components/ui/field";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/domain/dates";
import { invoiceRef, orderRef } from "@/domain/status";
import { likePattern } from "@/lib/catalogue/query";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Invoices" };
const PAGE_SIZE = 50;

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function AdminInvoicesPage({ searchParams }: PageProps<"/admin/invoices">) {
  await requireRole("admin");
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(sp.page), 10) || 1));
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
  const { data, count } = await query;
  const rows = data ?? [];
  const { data: orders } = rows.length
    ? await supabase.from("admin_order_summary").select("id, number, payment_state").in("id", rows.map((r) => r.order_id))
    : { data: [] };
  const order = new Map((orders ?? []).map((o) => [o.id, o]));
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `/admin/invoices?${s}` : "/admin/invoices";
  };

  return (
    <>
      <PageHeader title="Invoices" description="Every invoice, numbered without gaps. An invoice follows its order until the first delivery; a cancelled order's invoice is void." />
      <form action="/admin/invoices" className="mb-4 flex gap-2">
        <label htmlFor="invoices-q" className="sr-only">Invoice number or restaurant</label>
        <Input id="invoices-q" name="q" type="search" defaultValue={q} placeholder="Invoice number or restaurant" className="flex-1" />
        <button type="submit" className={buttonClasses({ className: "sm:h-10" })}>Search</button>
      </form>
      <Card>
        {rows.length === 0 ? (
          <EmptyNote title={q ? "No invoices match" : "No invoices yet"}>
            {q ? "Try another number or name." : "An invoice is made for every order."}
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
