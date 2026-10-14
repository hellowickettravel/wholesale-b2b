import "server-only";
import { after } from "next/server";
import { brand } from "@/config/brand";
import { hasBankDetails, filled } from "@/lib/placeholder";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";
import {
  renderAccountApproved, renderAccountRejected, renderAdminNewRegistration, renderGeneric, renderOrderChanged, renderOrderConfirmation, renderOrderDelivered,
  renderPaymentReminder, renderSupplierOrder, type OrderEmailData, type Rendered, type SupplierEmailData,
} from "@/server/email-render";
import { mailerConfigured, sendMail } from "@/server/mailer";

/**
 * The email outbox. Other code (database functions, server actions) adds a row to email_log with status "queued";
 * this module renders and sends those rows. A row is claimed by writing a lock into provider_id, so two runs at the
 * same moment never send the same email twice; a lock older than ten minutes is treated as a crashed run.
 */
type Admin = ReturnType<typeof createAdminClient>;
interface Row {
  id: string;
  to_email: string;
  template: string;
  subject: string;
  entity: string | null;
  entity_id: string | null;
}

const LOCK_MINUTES = 10;
const lockValue = (d = new Date()) => `lock:${d.toISOString()}`;

/** Schedules a send of the queue after the response has gone out. Safe to call anywhere in a server action. */
export function flushEmails(): void {
  if (!mailerConfigured()) return;
  try {
    after(async () => {
      await sendQueuedEmails().catch((e) => console.error("send emails failed:", (e as Error).message));
    });
  } catch {
    // Outside a request (scripts): nothing to schedule.
  }
}

export interface SendSummary {
  configured: boolean;
  sent: number;
  failed: number;
  waiting: number;
}

export async function sendQueuedEmails(limit = 25): Promise<SendSummary> {
  const admin = createAdminClient();
  if (!mailerConfigured()) {
    const { count } = await admin.from("email_log").select("id", { count: "exact", head: true }).eq("status", "queued");
    return { configured: false, sent: 0, failed: 0, waiting: count ?? 0 };
  }
  const stale = lockValue(new Date(Date.now() - LOCK_MINUTES * 60_000));
  const { data: rows } = await admin
    .from("email_log")
    .select("id, to_email, template, subject, entity, entity_id")
    .eq("status", "queued")
    .or(`provider_id.is.null,provider_id.lt.${stale}`)
    .order("created_at")
    .limit(limit);
  let sent = 0;
  let failed = 0;
  for (const row of (rows ?? []) as Row[]) {
    const claim = await admin.from("email_log").update({ provider_id: lockValue() }).eq("id", row.id).eq("status", "queued").or(`provider_id.is.null,provider_id.lt.${stale}`).select("id");
    if (!claim.data?.length) continue;
    try {
      const body = await render(admin, row);
      if (!body) {
        await admin.from("email_log").update({ status: "skipped", provider_id: null, error: "Nothing to send for this row." }).eq("id", row.id);
        continue;
      }
      const res = await sendMail({ to: row.to_email, subject: row.subject, ...body });
      if (res.error) {
        failed++;
        await admin.from("email_log").update({ status: "failed", provider_id: null, error: res.error }).eq("id", row.id);
      } else {
        sent++;
        await admin.from("email_log").update({ status: "sent", provider_id: res.id ?? "sent", error: null }).eq("id", row.id);
      }
    } catch (e) {
      failed++;
      await admin.from("email_log").update({ status: "failed", provider_id: null, error: (e as Error).message.slice(0, 300) }).eq("id", row.id);
    }
  }
  const { count } = await admin.from("email_log").select("id", { count: "exact", head: true }).eq("status", "queued");
  return { configured: true, sent, failed, waiting: count ?? 0 };
}

/** Puts failed emails back in the queue (admin "Try again"). */
export async function requeueFailedEmails(): Promise<number> {
  const { data } = await createAdminClient().from("email_log").update({ status: "queued", provider_id: null, error: null }).eq("status", "failed").select("id");
  return data?.length ?? 0;
}

async function render(admin: Admin, row: Row): Promise<Rendered | null> {
  const base = siteUrl();
  if (row.entity === "customer" && row.entity_id) {
    const { data: c } = await admin.from("customers").select("business_name").eq("id", row.entity_id).maybeSingle();
    if (!c) return null;
    if (row.template === "account_approved") return renderAccountApproved(c.business_name, `${base}/login`);
    if (row.template === "account_rejected") return renderAccountRejected(c.business_name);
    if (row.template === "admin_new_registration") {
      const { data: full } = await admin.from("customers").select("business_name, contact_name, email, phone").eq("id", row.entity_id).single();
      return renderAdminNewRegistration({ businessName: full?.business_name ?? "", contactName: full?.contact_name ?? "", email: full?.email ?? "", phone: full?.phone ?? "", url: `${base}/admin/approvals` });
    }
    return renderGeneric(row.subject, `${base}/login`);
  }
  if (row.entity === "supplier_order" && row.entity_id) return renderSupplier(admin, row, base);
  if ((row.entity === "order" || row.entity === "delivery_proof") && row.entity_id) {
    let orderId = row.entity_id;
    let partial = false;
    if (row.entity === "delivery_proof") {
      const { data: proof } = await admin.from("delivery_proofs").select("supplier_order_id").eq("id", row.entity_id).maybeSingle();
      if (!proof) return null;
      const { data: so } = await admin.from("supplier_orders").select("order_id").eq("id", proof.supplier_order_id).maybeSingle();
      if (!so) return null;
      orderId = so.order_id;
      const { data: order } = await admin.from("orders").select("status").eq("id", orderId).maybeSingle();
      partial = order?.status === "partially_delivered";
    }
    const data = await loadOrder(admin, orderId, base);
    if (!data) return null;
    switch (row.template) {
      case "order_confirmation": return renderOrderConfirmation(data);
      case "order_delivered": return renderOrderDelivered(data, partial);
      case "order_changed": return renderOrderChanged(data, "changed", row.subject);
      case "order_cancelled": return renderOrderChanged(data, "cancelled", row.subject);
      case "payment_reminder": return renderPaymentReminder(data);
      default: return renderGeneric(row.subject, data.url);
    }
  }
  return null;
}

async function loadOrder(admin: Admin, orderId: string, base: string): Promise<OrderEmailData | null> {
  const { data: o } = await admin
    .from("orders")
    .select("id, number, delivery_date, delivery_address, payment_terms, goods_net_pence, delivery_net_pence, vat_pence, total_pence, customers(business_name)")
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return null;
  const [{ data: items }, { data: pays }, { data: settings }] = await Promise.all([
    admin.from("order_items").select("product_name, size_label, qty, line_net_pence, line_vat_pence").eq("order_id", orderId).is("removed_at", null).order("sort"),
    admin.from("customer_payments").select("amount_pence").eq("order_id", orderId),
    admin.from("settings").select("bank_name, bank_account_name, bank_sort_code, bank_account_number").maybeSingle(),
  ]);
  const customer = o.customers as unknown as { business_name: string } | null;
  return {
    number: Number(o.number),
    businessName: customer?.business_name ?? "",
    deliveryDate: o.delivery_date,
    deliveryAddress: o.delivery_address,
    goodsNetPence: Number(o.goods_net_pence),
    deliveryNetPence: Number(o.delivery_net_pence),
    vatPence: Number(o.vat_pence),
    totalPence: Number(o.total_pence),
    paidPence: (pays ?? []).reduce((s, p) => s + Number(p.amount_pence), 0),
    paymentTerms: o.payment_terms,
    lines: (items ?? []).map((i) => ({ name: i.product_name, size: i.size_label, qty: i.qty, linePence: Number(i.line_net_pence) + Number(i.line_vat_pence) })),
    url: `${base}/orders/${o.id}`,
    invoicesUrl: `${base}/invoices`,
    bank: settings && hasBankDetails(settings) ? { name: filled(settings.bank_account_name), sortCode: filled(settings.bank_sort_code), accountNumber: filled(settings.bank_account_number) } : null,
  };
}

async function renderSupplier(admin: Admin, row: Row, base: string): Promise<Rendered | null> {
  const { data: so } = await admin
    .from("supplier_orders")
    .select("id, suppliers(name), orders(number, delivery_date, delivery_address, note, customers(business_name, phone, delivery_notes))")
    .eq("id", row.entity_id!)
    .maybeSingle();
  if (!so) return null;
  const { data: items } = await admin.from("order_items").select("product_name, size_label, qty").eq("supplier_order_id", so.id).is("removed_at", null).order("sort");
  const order = so.orders as unknown as { number: number; delivery_date: string; delivery_address: string; note: string | null; customers: { business_name: string; phone: string | null; delivery_notes: string | null } | null };
  const data: SupplierEmailData = {
    number: Number(order.number),
    supplierName: (so.suppliers as unknown as { name: string } | null)?.name ?? "",
    customerName: order.customers?.business_name ?? "",
    customerPhone: order.customers?.phone ?? null,
    deliveryDate: order.delivery_date,
    deliveryAddress: order.delivery_address,
    deliveryNotes: order.customers?.delivery_notes ?? null,
    note: order.note,
    lines: (items ?? []).map((i) => ({ name: i.product_name, size: i.size_label, qty: i.qty })),
    url: `${base}/supplier/orders/${so.id}`,
  };
  const kind = row.template === "supplier_order_cancelled" ? "cancelled" : row.template === "supplier_order_changed" ? "changed" : "new";
  return renderSupplierOrder(data, kind, row.subject);
}

/** Adds an email to the outbox for the team (new registration). Best effort: never blocks registration. */
export async function queueAdminNewRegistration(customerId: string): Promise<void> {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  try {
    await createAdminClient().from("email_log").insert({
      to_email: to,
      template: "admin_new_registration",
      subject: `New trade account to review at ${brand.name}`,
      status: "queued",
      entity: "customer",
      entity_id: customerId,
    });
  } catch (e) {
    console.error("queue admin notification failed:", (e as Error).message);
  }
}
