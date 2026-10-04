import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import { invoiceRef, orderRef, paymentStatus } from "@/domain/status";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Invoices" };
const PAGE_SIZE = 20;
const PAID = { unpaid: { label: "Not paid", tone: "warning" }, part_paid: { label: "Part paid", tone: "info" }, paid: { label: "Paid", tone: "success" }, overpaid: { label: "Paid", tone: "success" } } as const;

/** The restaurant's invoices (RLS: its own only), newest first, each with its PDF. */
export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const viewer = await requireRole("customer");
  const sp = await searchParams;
  const n = Number.parseInt(String(sp.page ?? "1"), 10);
  const page = Number.isFinite(n) && n >= 1 && n <= 1000 ? n : 1;
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("invoices")
    .select("id, number, issued_at, voided_at, total_pence, order_id", { count: "exact" })
    .order("number", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error && error.code !== "PGRST103") throw new Error(`invoices: ${error.message}`);
  const invoices = data ?? [];
  const orderIds = invoices.map((i) => i.order_id);
  const [{ data: orders }, { data: payments }] = orderIds.length
    ? await Promise.all([
        supabase.from("customer_orders").select("id, number").in("id", orderIds),
        supabase.from("customer_payment_history").select("order_id, amount_pence").in("order_id", orderIds),
      ])
    : [{ data: [] }, { data: [] }];
  const orderNo = new Map((orders ?? []).map((o) => [o.id, Number(o.number)]));
  const paid = (orderId: string) => (payments ?? []).filter((p) => p.order_id === orderId).reduce((a, p) => a + Number(p.amount_pence), 0);
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader eyebrow={viewer.customer!.businessName} title="Invoices" description="One invoice per order. Pay by bank transfer using the order reference." />
      {invoices.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-raised">
          <EmptyState icon={<FileText />} title={page > 1 ? "No more invoices" : "No invoices yet"} action={<LinkButton href="/shop">Browse your catalogue</LinkButton>}>
            An invoice is made for every order you place.
          </EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
          {invoices.map((inv) => {
            const state = PAID[paymentStatus(inv.total_pence, paid(inv.order_id))];
            const ref = orderNo.has(inv.order_id) ? orderRef(orderNo.get(inv.order_id)!) : null;
            return (
              <li key={inv.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="tabular font-semibold text-ink">{invoiceRef(inv.number)}</span>
                    {inv.voided_at ? <Badge tone="neutral">Void</Badge> : <Badge tone={state.tone}>{state.label}</Badge>}
                  </div>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    {formatDate(inv.issued_at)}
                    {ref ? <> · <Link href={`/orders/${inv.order_id}`} className="font-medium text-primary hover:underline">{ref}</Link></> : null}
                  </p>
                </div>
                <span className="tabular font-semibold text-ink">{formatPence(inv.total_pence)}</span>
                <a
                  href={`/api/invoices/${inv.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-line-strong bg-raised px-3 text-sm font-semibold text-ink hover:bg-sunken"
                >
                  <Download className="size-4" aria-hidden="true" />
                  PDF<span className="sr-only"> of {invoiceRef(inv.number)}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefFor={(p) => (p > 1 ? `/invoices?page=${p}` : "/invoices")} />
    </>
  );
}
