import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Power } from "lucide-react";
import { InviteLoginForm } from "@/app/admin/customers/[id]/small-forms";
import { ActionButton } from "@/app/admin/orders/[id]/forms";
import { SupplierPayBadge } from "@/components/admin/payment-badge";
import { DeliveryStatusBadge } from "@/components/shop/order-status";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, formatShortDate, todayInLondon } from "@/domain/dates";
import { supplierPayState } from "@/domain/ledger";
import { orderRef } from "@/domain/status";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { owedBySupplierOrder } from "@/server/admin-orders";
import { inviteSupplierLogin, paySupplierParts, setLoginActive, setSupplierActive, updateSupplier } from "../actions";
import { PayPartsForm, SupplierForm } from "../forms";

export const metadata: Metadata = { title: "Supplier" };

export default async function SupplierPage({ params, searchParams }: PageProps<"/admin/suppliers/[id]">) {
  const viewer = await requireRole("admin");
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: s }, { data: logins }, { data: parts }, { count: sizes }] = await Promise.all([
    supabase.from("suppliers").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("id, email, full_name, active, created_at").eq("supplier_id", id).eq("role", "supplier").order("created_at"),
    supabase.from("admin_supplier_order_summary").select("*").eq("supplier_id", id).order("created_at", { ascending: false }).limit(200),
    supabase.from("product_variants").select("id", { count: "exact", head: true }).eq("supplier_id", id).eq("active", true),
  ]);
  if (!s) notFound();
  const today = todayInLondon();
  const all = parts ?? [];
  const owed = await owedBySupplierOrder(supabase, all.filter((p) => p.status !== "cancelled").map((p) => p.id!));
  const view = all.map((p) => {
    const o = owed.get(p.id!);
    return { ...p, owed: o, left: o ? Math.max(0, o.grossPence - (p.paid_pence ?? 0)) : 0, state: o ? supplierPayState(o.grossPence, p.paid_pence ?? 0, p.paid_to_supplier ?? false) : ("paid" as const) };
  });
  const unpaid = view.filter((p) => p.status !== "cancelled" && p.state !== "paid");
  const dueNow = unpaid.filter((p) => p.status === "delivered").reduce((a, p) => a + p.left, 0);

  return (
    <>
      <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted"><Link href="/admin/suppliers" className="hover:text-ink">Suppliers</Link></div>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold text-ink sm:text-[28px]">
            {s.name}
            {s.active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Switched off</Badge>}
          </h1>
          <p className="mt-1 text-[15px] text-ink-muted">
            {sizes ?? 0} product size{sizes === 1 ? "" : "s"} · <Money pence={dueNow} /> owed for delivered orders
          </p>
        </div>
        <ActionButton
          action={setSupplierActive.bind(null, s.id, !s.active)}
          variant={s.active ? "secondary" : "primary"}
          icon={<Power className="size-4" aria-hidden="true" />}
          confirm={s.active ? "Switch this supplier off? Restaurants will not be able to order its sizes until you switch it back on. Orders already placed carry on." : undefined}
        >
          {s.active ? "Switch off" : "Switch on"}
        </ActionButton>
      </div>
      {notice === "created" ? <Alert tone="success" className="mb-4">Supplier added. Choose it on the product sizes it supplies, and invite a login below.</Alert> : null}
      {!s.active ? <Alert tone="warning" className="mb-4">Switched off: restaurants cannot order this supplier&apos;s sizes. Orders already placed carry on.</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="To pay" description="Tick the orders one transfer paid. What is still owed on each is recorded as the payment." />
            <CardBody>
              {unpaid.length ? (
                <PayPartsForm
                  action={paySupplierParts.bind(null, s.id)}
                  today={today}
                  parts={unpaid.map((p) => ({
                    id: p.id!,
                    orderId: p.order_id!,
                    label: `${orderRef(p.order_number!)} · delivery ${formatShortDate(p.delivery_date!, today)}`,
                    customerName: p.customer_name ?? "",
                    delivered: p.status === "delivered",
                    leftPence: p.left,
                    costMissing: p.owed?.costMissing ?? false,
                  }))}
                />
              ) : (
                <p className="text-sm text-ink-muted">Nothing to pay this supplier.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Orders" description="The latest 200 parts of orders this supplier delivers." />
            {view.length ? (
              <Table>
                <THead>
                  <tr>
                    <TH>Order</TH>
                    <TH className="hidden sm:table-cell">Delivery</TH>
                    <TH className="text-right">Cost + VAT</TH>
                    <TH className="hidden md:table-cell">Paid</TH>
                  </tr>
                </THead>
                <tbody>
                  {view.map((p) => (
                    <TR key={p.id}>
                      <TD>
                        <Link href={`/admin/orders/${p.order_id}`} className="block font-semibold hover:text-primary hover:underline">{orderRef(p.order_number!)}</Link>
                        <span className="block text-[13px] text-ink-muted">{p.customer_name} · {formatShortDate(p.delivery_date!, today)}</span>
                      </TD>
                      <TD className="hidden sm:table-cell"><DeliveryStatusBadge status={p.status!} /></TD>
                      <TD className="text-right">{p.owed ? <Money pence={p.owed.grossPence} /> : <span className="text-ink-muted">—</span>}</TD>
                      <TD className="hidden md:table-cell">{p.status === "cancelled" ? <span className="text-ink-muted">—</span> : <SupplierPayBadge state={p.state} />}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            ) : (
              <CardBody><p className="text-sm text-ink-muted">No orders yet.</p></CardBody>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <SupplierForm
                action={updateSupplier.bind(null, s.id)}
                submitLabel="Save details"
                initial={{ name: s.name, email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "", notes: s.notes ?? "" }}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Logins" description="People who sign in to see this supplier's orders and make driver links." />
            <CardBody className="space-y-4">
              {logins?.length ? (
                <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
                  {logins.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-medium text-ink">{l.full_name || "—"}{l.active ? null : <Badge tone="neutral">Off</Badge>}</span>
                        <span className="block break-all text-ink-muted">{l.email} · since {formatDate(l.created_at)}</span>
                      </span>
                      {l.id === viewer.userId ? null : (
                        <ActionButton action={setLoginActive.bind(null, l.id, !l.active)} confirm={l.active ? `Switch off ${l.email}? They will no longer be able to sign in.` : undefined}>
                          {l.active ? "Switch off" : "Switch on"}
                        </ActionButton>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">No one can sign in for this supplier yet, so it only gets orders by email.</p>
              )}
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-primary">Invite someone to sign in</summary>
                <div className="pt-3">
                  <InviteLoginForm action={inviteSupplierLogin.bind(null, s.id)} email={logins?.length ? "" : (s.email ?? "")} name="" />
                </div>
              </details>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
