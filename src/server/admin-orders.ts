import "server-only";
import { z } from "zod";
import { addDays, todayInLondon } from "@/domain/dates";
import { chaseFlags, orderProfit, owedToSupplier, supplierPayState } from "@/domain/ledger";
import type { OrderStatus } from "@/domain/status";
import { describeOrderEvent, type AuditEntry } from "@/lib/audit-format";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { activeLink, signProofs } from "./delivery";

/**
 * Admin reads for orders, payments and suppliers. Every query runs with the ADMIN'S OWN client:
 * the base tables and admin_* views return rows only to admins (RLS + is_admin()). Callers
 * must still requireRole("admin") first. Money maths comes from src/domain (D6).
 */

type Client = Awaited<ReturnType<typeof createClient>>;

export interface Owed {
  netPence: number;
  vatPence: number;
  grossPence: number;
  costMissing: boolean;
}

/** What is owed to the supplier for each supplier order (live lines only, D6). */
export async function owedBySupplierOrder(supabase: Client, ids: string[]): Promise<Map<string, Owed>> {
  const out = new Map<string, Owed>();
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 150) {
    const chunk = unique.slice(i, i + 150);
    const lines = await fetchAll((from, to) =>
      supabase
        .from("order_items")
        .select("supplier_order_id, qty, vat_rate_bp, unit_cost_pence")
        .in("supplier_order_id", chunk)
        .is("removed_at", null)
        .order("id")
        .range(from, to),
    );
    for (const id of chunk) out.set(id, owedToSupplier(lines.filter((l) => l.supplier_order_id === id).map((l) => ({ qty: l.qty, vatRateBp: l.vat_rate_bp, unitCostPence: l.unit_cost_pence }))));
  }
  return out;
}

export async function getDashboard() {
  const supabase = await createClient();
  const today = todayInLondon();
  const monthStart = `${today.slice(0, 8)}01`;
  const [owing, unpaidParts, pending, latest, month] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("admin_order_summary")
        .select("id, number, status, customer_name, balance_pence, promised_pay_date, next_chase_date, total_pence")
        .neq("status", "cancelled")
        .gt("balance_pence", 0)
        .order("number")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("admin_supplier_order_summary")
        .select("id, supplier_id, supplier_name, status, paid_pence, paid_to_supplier")
        .neq("status", "cancelled")
        .eq("paid_to_supplier", false)
        .order("id")
        .range(from, to),
    ),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("admin_order_summary")
      .select("id, number, status, created_at, delivery_date, customer_name, total_pence, payment_state")
      .order("created_at", { ascending: false })
      .limit(6),
    fetchAll((from, to) =>
      supabase
        .from("admin_order_summary")
        .select("id, goods_net_pence, delivery_net_pence, cost_pence, cost_missing")
        .neq("status", "cancelled")
        .gte("created_at", `${monthStart}T00:00:00Z`)
        .order("id")
        .range(from, to),
    ),
  ]);

  let owedToYou = 0;
  const chase: typeof owing = [];
  let overdue = 0;
  for (const o of owing) {
    owedToYou += o.balance_pence ?? 0;
    const f = chaseFlags({ status: o.status as OrderStatus, balancePence: o.balance_pence ?? 0, promisedPayDate: o.promised_pay_date, nextChaseDate: o.next_chase_date }, today);
    if (f.chaseDue) chase.push(o);
    if (f.overdue) overdue++;
  }

  const owed = await owedBySupplierOrder(supabase, unpaidParts.map((p) => p.id!));
  let dueSuppliers = 0;
  let laterSuppliers = 0;
  let costMissing = false;
  for (const p of unpaidParts) {
    const o = owed.get(p.id!)!;
    const left = Math.max(0, o.grossPence - (p.paid_pence ?? 0));
    if (supplierPayState(o.grossPence, p.paid_pence ?? 0, false) === "paid") continue;
    if (o.costMissing) costMissing = true;
    if (p.status === "delivered") dueSuppliers += left;
    else laterSuppliers += left;
  }

  let sales = 0;
  let profit = 0;
  let profitKnown = true;
  for (const o of month) {
    sales += (o.goods_net_pence ?? 0) + (o.delivery_net_pence ?? 0);
    const p = orderProfit({ goodsNetPence: o.goods_net_pence ?? 0, deliveryNetPence: o.delivery_net_pence ?? 0, costPence: o.cost_pence, costMissing: o.cost_missing ?? false });
    if (p === null) profitKnown = false;
    else profit += p;
  }

  return {
    today,
    owedToYou,
    unpaidOrders: owing.length,
    overdue,
    chase: chase.sort((a, b) => (a.next_chase_date ?? "").localeCompare(b.next_chase_date ?? "")),
    dueSuppliers,
    laterSuppliers,
    supplierCostMissing: costMissing,
    pendingApprovals: pending.count ?? 0,
    latest: latest.data ?? [],
    month: { orders: month.length, salesNetPence: sales, profitPence: profit, profitKnown },
  };
}

/** Everything the admin order page needs. Null when the id is not an order. */
export async function getAdminOrder(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data: order, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`order: ${error.message}`);
  if (!order) return null;

  const [customer, summary, items, parts, payments, supplierPayments, invoice, suppliers, settings] = await Promise.all([
    supabase.from("customers").select("id, business_name, contact_name, email, phone").eq("id", order.customer_id).single(),
    supabase.from("admin_order_summary").select("paid_pence, balance_pence, payment_state, cost_pence, cost_missing").eq("id", id).single(),
    supabase.from("order_items").select("*").eq("order_id", id).order("sort"),
    supabase.from("admin_supplier_order_summary").select("*").eq("order_id", id),
    supabase.from("customer_payments").select("*").eq("order_id", id).order("paid_on").order("created_at"),
    supabase.from("supplier_payments").select("*, supplier_orders!inner(order_id)").eq("supplier_orders.order_id", id).order("paid_on"),
    supabase.from("invoices").select("id, number, issued_at, voided_at, total_pence").eq("order_id", id).maybeSingle(),
    supabase.from("suppliers").select("id, name, active").order("name"),
    supabase.from("settings").select("delivery_vat_mode, delivery_fixed_vat_bp, min_order_pence, delivery_charge_pence").single(),
  ]);
  for (const r of [customer, summary, items, parts, payments, supplierPayments, invoice, suppliers, settings]) if (r.error) throw new Error(`order: ${r.error.message}`);

  const partIds = (parts.data ?? []).map((p) => p.id!);
  const { data: proofRows } = partIds.length
    ? await supabase.from("delivery_proofs").select("id, supplier_order_id, created_at, expires_at, revoked_at, submitted_at, submitted_by_kind, photo_path, document_path, signature_path, signed_by_name").in("supplier_order_id", partIds).order("created_at", { ascending: false })
    : { data: [] };
  const proofs = proofRows ?? [];
  const signed = await signProofs(proofs.filter((p) => p.submitted_at));
  const owed = await owedBySupplierOrder(supabase, partIds);

  const live = (items.data ?? []).filter((i) => !i.removed_at);
  const removed = (items.data ?? []).filter((i) => i.removed_at);
  const firstSort = new Map<string, number>();
  for (const it of live) if (!firstSort.has(it.supplier_order_id)) firstSort.set(it.supplier_order_id, it.sort);
  const supplierName = new Map((suppliers.data ?? []).map((s) => [s.id, s.name]));

  const partViews = (parts.data ?? [])
    .map((p) => {
      const o = owed.get(p.id!)!;
      return {
        ...p,
        id: p.id!,
        status: p.status!,
        lines: live.filter((l) => l.supplier_order_id === p.id),
        owed: o,
        payState: supplierPayState(o.grossPence, p.paid_pence ?? 0, p.paid_to_supplier ?? false),
        payments: (supplierPayments.data ?? []).filter((sp) => sp.supplier_order_id === p.id),
        proof: signed.find((s) => s.supplierOrderId === p.id) ?? null,
        activeLink: activeLink(proofs.filter((r) => r.supplier_order_id === p.id)),
      };
    })
    .sort((a, b) => (firstSort.get(a.id) ?? 1e9) - (firstSort.get(b.id) ?? 1e9));

  // Timeline: audit rows for the order and everything hanging off it.
  const ids = [id, ...partIds, ...(items.data ?? []).map((i) => i.id), ...(payments.data ?? []).map((p) => p.id), ...(supplierPayments.data ?? []).map((p) => p.id), ...proofs.map((p) => p.id), ...(invoice.data ? [invoice.data.id] : [])];
  const { data: audit } = await supabase.from("audit_log").select("*").in("entity_id", ids).order("at", { ascending: true }).order("id").limit(500);
  const placedAt = (audit ?? []).find((a) => a.entity === "orders" && a.action === "insert")?.at;
  const actorIds = [...new Set((audit ?? []).map((a) => a.actor_id).filter((x): x is string => Boolean(x)))];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, full_name, email, role").in("id", actorIds) : { data: [] };
  const actorName = (aid: string | null, entity: string) => {
    if (!aid) return entity === "delivery_proofs" ? "Driver" : "System";
    const p = (actors ?? []).find((x) => x.id === aid);
    return p?.full_name || p?.email || "Someone";
  };
  const timeline = (audit ?? [])
    .filter((a) => !(placedAt && a.at === placedAt && !(a.entity === "orders" && a.action === "insert")))
    .map((a) => ({ id: a.id, at: a.at, who: actorName(a.actor_id, a.entity), text: describeOrderEvent(a as AuditEntry, { supplier: (sid) => supplierName.get(sid) ?? "Supplier" }) }))
    .filter((t): t is { id: number; at: string; who: string; text: string } => Boolean(t.text))
    .reverse();

  const sum = summary.data!;
  const today = todayInLondon();
  return {
    order,
    customer: customer.data!,
    paidPence: sum.paid_pence ?? 0,
    balancePence: sum.balance_pence ?? 0,
    paymentState: sum.payment_state ?? "unpaid",
    costPence: sum.cost_pence,
    costMissing: sum.cost_missing ?? false,
    profitPence: orderProfit({ goodsNetPence: order.goods_net_pence, deliveryNetPence: order.delivery_net_pence, costPence: sum.cost_pence, costMissing: sum.cost_missing ?? false }),
    flags: chaseFlags({ status: order.status, balancePence: sum.balance_pence ?? 0, promisedPayDate: order.promised_pay_date, nextChaseDate: order.next_chase_date }, today),
    lines: live,
    removed,
    parts: partViews,
    payments: payments.data ?? [],
    invoice: invoice.data,
    suppliers: suppliers.data ?? [],
    settings: settings.data!,
    timeline,
    today,
    tomorrow: addDays(today, 1),
  };
}

export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;
