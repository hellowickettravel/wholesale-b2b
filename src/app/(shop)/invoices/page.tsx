import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { ShopTitle } from "@/components/shop/page-title";
import { PlateMessage } from "@/components/shop/plate-message";
import { Badge } from "@/components/ui/badge";
import { buttonClasses, LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import { invoiceRef, orderRef, paymentStatus } from "@/domain/status";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Invoices" };
const PAGE_SIZE = 20;
const PAID = { unpaid: { label: "Not paid", tone: "neutral" }, part_paid: { label: "Part paid", tone: "warning" }, paid: { label: "Paid", tone: "success" }, overpaid: { label: "Paid", tone: "success" } } as const;

/** The restaurant's invoices (RLS: its own only), newest first, each with its PDF. */
export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  await requireRole("customer");
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
      <ShopTitle description="One invoice per order. Pay by bank transfer using the order reference.">Invoices</ShopTitle>
      {invoices.length === 0 ? (
        <PlateMessage title={page > 1 ? "No more invoices" : "No invoices yet"} action={<LinkButton href="/shop">Browse your catalogue</LinkButton>}>
          An invoice is made for every order you place.
        </PlateMessage>
      ) : (
        <ul className="space-y-3">
          {invoices.map((inv) => {
            const state = PAID[paymentStatus(inv.total_pence, paid(inv.order_id))];
            const ref = orderNo.has(inv.order_id) ? orderRef(orderNo.get(inv.order_id)!) : null;
            return (
              <li key={inv.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-[var(--radius-lg)] border border-line bg-raised px-4 py-4 shadow-rest sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-6 sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="tabular text-lg font-bold text-ink">{invoiceRef(inv.number)}</span>
                    {inv.voided_at ? <Badge tone="neutral">Void</Badge> : <Badge tone={state.tone}>{state.label}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    Issued {formatDate(inv.issued_at)}
                    {ref ? <span className="ml-3">For <Link href={`/orders/${inv.order_id}`} className="inline-flex min-h-8 items-center font-bold text-primary hover:underline">{ref}</Link></span> : null}
                  </p>
                </div>
                <span className={`tabular text-xl font-bold text-ink${inv.voided_at ? " line-through decoration-2" : ""}`}>{formatPence(inv.total_pence)}</span>
                <a
                  href={`/api/invoices/${inv.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses({ variant: "secondary", className: "col-span-2 sm:col-span-1" })}
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
