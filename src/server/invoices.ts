import "server-only";
import { z } from "zod";
import { invoiceSummary, type InvoiceSummary } from "@/domain/invoice";
import { createClient } from "@/lib/supabase/server";
import type { Viewer } from "./auth";

/**
 * One invoice with everything its PDF shows, read with the VIEWER'S OWN client:
 * - a restaurant reads `invoices` (RLS: own approved customer), `customer_orders` and
 *   `customer_order_items` (no cost, no supplier), so another restaurant's id simply finds nothing;
 * - an admin reads the same views' base tables through admin RLS.
 * Suppliers and everyone else get null. Lines taken off the order are never shown.
 */
export interface InvoiceDocument {
  number: number;
  issuedAt: string;
  voidedAt: string | null;
  orderNumber: number;
  orderDate: string;
  deliveryDate: string;
  paymentTerms: "on_delivery" | "within_7_days" | "on_date";
  payBy: string | null;
  billTo: { name: string; contact: string | null; address: string; email: string | null };
  deliverTo: string;
  lines: { productName: string; sizeLabel: string; qty: number; unitPricePence: number; vatRateBp: number; lineNetPence: number; lineVatPence: number }[];
  summary: InvoiceSummary;
  paidPence: number;
  seller: {
    legalName: string;
    address: string;
    vatNumber: string;
    bankName: string;
    accountName: string;
    sortCode: string;
    accountNumber: string;
    iban: string | null;
    footer: string;
  };
}

export async function getInvoiceDocument(id: string, viewer: Viewer): Promise<InvoiceDocument | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const isAdmin = viewer.role === "admin";
  const isCustomer = viewer.role === "customer" && viewer.customer?.status === "approved";
  if (!viewer.active || (!isAdmin && !isCustomer)) return null;

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, number, issued_at, voided_at, order_id, customer_id, goods_net_pence, goods_vat_pence, delivery_net_pence, delivery_vat_pence, vat_pence, total_pence")
    .eq("id", id)
    .maybeSingle();
  if (!inv) return null;
  // Belt and braces on top of RLS: a restaurant only ever gets its own.
  if (isCustomer && inv.customer_id !== viewer.customer!.id) return null;

  const orderQuery = isAdmin
    ? supabase.from("orders").select("number, created_at, delivery_date, delivery_address, payment_terms, promised_pay_date").eq("id", inv.order_id).maybeSingle()
    : supabase.from("customer_orders").select("number, created_at, delivery_date, delivery_address, payment_terms, promised_pay_date").eq("id", inv.order_id).maybeSingle();
  const linesQuery = isAdmin
    ? supabase.from("order_items").select("product_name, size_label, qty, unit_price_pence, vat_rate_bp, line_net_pence, line_vat_pence, sort").eq("order_id", inv.order_id).is("removed_at", null).order("sort")
    : supabase.from("customer_order_items").select("product_name, size_label, qty, unit_price_pence, vat_rate_bp, line_net_pence, line_vat_pence, sort").eq("order_id", inv.order_id).order("sort");
  const paymentsQuery = isAdmin
    ? supabase.from("customer_payments").select("amount_pence").eq("order_id", inv.order_id)
    : supabase.from("customer_payment_history").select("amount_pence").eq("order_id", inv.order_id);

  const [{ data: order }, { data: lines }, { data: payments }, { data: customer }, { data: seller }] = await Promise.all([
    orderQuery,
    linesQuery,
    paymentsQuery,
    supabase.from("customers").select("business_name, contact_name, email, address_line1, address_line2, city, postcode").eq("id", inv.customer_id).maybeSingle(),
    supabase.from("shop_settings").select("business_legal_name, business_address, vat_number, bank_name, bank_account_name, bank_sort_code, bank_account_number, bank_iban, invoice_footer").maybeSingle(),
  ]);
  if (!order || !lines || !customer || !seller) return null;

  const docLines = lines.map((l) => ({
    productName: l.product_name ?? "",
    sizeLabel: l.size_label ?? "",
    qty: Number(l.qty),
    unitPricePence: Number(l.unit_price_pence),
    vatRateBp: Number(l.vat_rate_bp),
    lineNetPence: Number(l.line_net_pence),
    lineVatPence: Number(l.line_vat_pence),
  }));
  const summary = invoiceSummary(docLines, {
    goodsNetPence: inv.goods_net_pence,
    goodsVatPence: inv.goods_vat_pence,
    deliveryNetPence: inv.delivery_net_pence,
    deliveryVatPence: inv.delivery_vat_pence,
    vatPence: inv.vat_pence,
    totalPence: inv.total_pence,
  });
  if (!summary.consistent) console.error(`invoice ${inv.number}: lines do not match the invoice totals`);

  return {
    number: inv.number,
    issuedAt: inv.issued_at,
    voidedAt: inv.voided_at,
    orderNumber: Number(order.number),
    orderDate: order.created_at!,
    deliveryDate: order.delivery_date!,
    paymentTerms: order.payment_terms!,
    payBy: order.promised_pay_date,
    billTo: {
      name: customer.business_name,
      contact: customer.contact_name,
      address: [customer.address_line1, customer.address_line2, customer.city, customer.postcode].filter(Boolean).join(", "),
      email: customer.email,
    },
    deliverTo: order.delivery_address ?? "",
    lines: docLines,
    summary,
    paidPence: (payments ?? []).reduce((a, p) => a + Number(p.amount_pence), 0),
    seller: {
      legalName: seller.business_legal_name ?? "",
      address: seller.business_address ?? "",
      vatNumber: seller.vat_number ?? "",
      bankName: seller.bank_name ?? "",
      accountName: seller.bank_account_name ?? "",
      sortCode: seller.bank_sort_code ?? "",
      accountNumber: seller.bank_account_number ?? "",
      iban: seller.bank_iban,
      footer: seller.invoice_footer ?? "",
    },
  };
}
