import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { DriverLinkCard, ProofUpload } from "@/components/delivery/driver-link";
import { ProofView } from "@/components/delivery/proof-view";
import { DeliveryStatusBadge } from "@/components/shop/order-status";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDayDate, formatTimestamp } from "@/domain/dates";
import { orderRef } from "@/domain/status";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { activeLink, signProofs } from "@/server/delivery";
import { newDriverLink, uploadOwnProof } from "./actions";
import { StatusButtons } from "./controls";

export const metadata: Metadata = { title: "Order" };

/** Everything here comes from the supplier's own price-free views (RLS: own supplier only). */
export default async function SupplierOrderPage({ params }: PageProps<"/supplier/orders/[id]">) {
  const viewer = await requireRole("supplier");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: so } = await supabase.from("supplier_order_list").select("*").eq("id", id).maybeSingle();
  if (!so) notFound();
  const [{ data: lines }, { data: proofRows }] = await Promise.all([
    supabase.from("supplier_order_lines").select("id, product_name, size_label, sku, qty").eq("supplier_order_id", id).order("sort"),
    supabase.from("supplier_delivery_proofs").select("*").eq("supplier_order_id", id).order("created_at", { ascending: false }),
  ]);
  // Opening the order reads its notifications.
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", viewer.userId).eq("link", `/supplier/orders/${id}`).is("read_at", null);

  const proofs = await signProofs((proofRows ?? []).map((p) => ({ ...p, id: p.id!, supplier_order_id: p.supplier_order_id })));
  const active = activeLink(proofRows ?? []);
  const open = so.status !== "delivered" && so.status !== "cancelled";
  const units = (lines ?? []).reduce((a, l) => a + (l.qty ?? 0), 0);

  return (
    <>
      <Link href="/supplier" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Orders
      </Link>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-5">
        <h1 className="tabular text-3xl font-bold">{orderRef(so.order_number!)}</h1>
        <DeliveryStatusBadge status={so.status!} />
        <span className="w-full text-sm text-ink-muted sm:w-auto">Received {formatTimestamp(so.created_at!)}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title={`Deliver on ${formatDayDate(so.delivery_date!)}`} description={`${(lines ?? []).length} ${(lines ?? []).length === 1 ? "line" : "lines"}, ${units} ${units === 1 ? "item" : "items"}`} />
            <Table>
              <THead>
                <tr>
                  <TH>Item</TH>
                  <TH className="hidden sm:table-cell">SKU</TH>
                  <TH className="text-right">Qty</TH>
                </tr>
              </THead>
              <tbody>
                {(lines ?? []).map((l) => (
                  <TR key={l.id}>
                    <TD>
                      <div className="font-medium">{l.product_name}</div>
                      <div className="text-[13px] text-ink-muted">{l.size_label}</div>
                    </TD>
                    <TD className="hidden text-ink-muted sm:table-cell">{l.sku ?? "—"}</TD>
                    <TD className="tabular text-right text-base font-bold">{l.qty}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>

          {proofs.length ? (
            <Card>
              <CardHeader title="Proof of delivery" />
              <CardBody>
                <ProofView proof={proofs[0]} />
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Restaurant" />
            <CardBody className="space-y-2 text-sm">
              <p className="font-semibold text-ink">{so.customer_name}</p>
              <p className="flex items-start gap-2 text-ink-muted"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {so.delivery_address}</p>
              {so.customer_phone ? (
                <a href={`tel:${so.customer_phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 font-medium text-primary">
                  <Phone className="size-4" aria-hidden="true" /> {so.customer_contact ? `${so.customer_contact}, ` : ""}{so.customer_phone}
                </a>
              ) : null}
              {so.order_note ? <p className="rounded-[var(--radius-md)] bg-accent-soft px-3 py-2 text-ink">Note: {so.order_note}</p> : null}
            </CardBody>
          </Card>

          {open ? (
            <>
              <Card>
                <CardHeader title="Progress" description={so.status === "placed" ? "Accept the order so we know you have it." : undefined} />
                <CardBody>
                  {so.status === "out_for_delivery" ? (
                    <p className="text-sm text-ink-muted">Out for delivery. It is marked delivered when the proof is sent.</p>
                  ) : (
                    <StatusButtons id={id} status={so.status!} />
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Driver link" />
                <CardBody>
                  <DriverLinkCard
                    makeLink={newDriverLink.bind(null, id)}
                    customerName={so.customer_name ?? "the restaurant"}
                    active={active ? { createdAt: active.created_at!, expiresAt: active.expires_at! } : null}
                  />
                </CardBody>
              </Card>
              <ProofUpload upload={uploadOwnProof.bind(null, id)} />
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
