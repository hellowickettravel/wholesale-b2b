/**
 * Turns audit_log rows into plain sentences for the order timeline and the audit log screen.
 * Pure (no I/O): names of suppliers and people are passed in.
 */
import { formatShortDate } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import { STATUS_LABEL, SUPPLIER_STATUS_LABEL, type OrderStatus, type SupplierOrderStatus } from "@/domain/status";

type Row = Record<string, unknown>;

export interface AuditEntry {
  id: number;
  at: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before: unknown;
  after: unknown;
}

export interface AuditNames {
  supplier: (id: string) => string;
}

const METHOD: Record<string, string> = { bank_transfer: "bank transfer", cash: "cash", cheque: "cheque", card: "card", other: "other" };
const BY = { driver: "the driver", supplier: "the supplier", admin: "the admin" } as const;

function obj(v: unknown): Row | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : null;
}

function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

/** Keys whose value changed between before and after (ignoring updated_at). */
export function changedKeys(before: unknown, after: unknown): string[] {
  const b = obj(before) ?? {};
  const a = obj(after) ?? {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  return [...keys].filter((k) => k !== "updated_at" && JSON.stringify(b[k] ?? null) !== JSON.stringify(a[k] ?? null)).sort();
}

const dateOrNone = (v: unknown) => (v ? formatShortDate(str(v)) : "none");

/**
 * One readable line per change that matters on an order. Null for rows that only add noise
 * (lines written at order time, links revoked as a side effect, invoice created with the order).
 * The caller drops rows written in the same transaction as the order itself (same `at`).
 */
export function describeOrderEvent(e: AuditEntry, names: AuditNames): string | null {
  const b = obj(e.before);
  const a = obj(e.after);
  const item = (r: Row | null) => `${str(r?.product_name)} ${str(r?.size_label)}`.trim();

  switch (e.entity) {
    case "orders": {
      if (e.action === "insert") return `Order placed: ${formatPence(num(a?.total_pence))}`;
      if (!a || !b) return null;
      const out: string[] = [];
      if (a.status !== b.status) {
        out.push(a.status === "cancelled" && a.cancel_reason
          ? `Order cancelled: ${str(a.cancel_reason)}`
          : `Status: ${STATUS_LABEL[b.status as OrderStatus] ?? str(b.status)} → ${STATUS_LABEL[a.status as OrderStatus] ?? str(a.status)}`);
      }
      if (a.total_pence !== b.total_pence) out.push(`Total ${formatPence(num(b.total_pence))} → ${formatPence(num(a.total_pence))}`);
      if (a.promised_pay_date !== b.promised_pay_date) out.push(`Promised payment date: ${dateOrNone(a.promised_pay_date)}`);
      if (a.next_chase_date !== b.next_chase_date && a.status !== "cancelled") out.push(`Next chase: ${dateOrNone(a.next_chase_date)}`);
      if (a.payment_notes !== b.payment_notes) out.push("Payment notes updated");
      return out.length ? out.join(" · ") : null;
    }
    case "supplier_orders": {
      const sup = names.supplier(str((a ?? b)?.supplier_id));
      if (e.action === "insert") return `${sup}: part added`;
      if (!a || !b) return null;
      const out: string[] = [];
      if (a.status !== b.status) out.push(`${sup}: ${SUPPLIER_STATUS_LABEL[a.status as SupplierOrderStatus] ?? str(a.status)}`);
      if (a.paid_to_supplier !== b.paid_to_supplier) out.push(a.paid_to_supplier ? `${sup} marked paid` : `${sup} marked unpaid`);
      return out.length ? out.join(" · ") : null;
    }
    case "order_items": {
      if (e.action !== "update" || !a || !b) return null;
      const out: string[] = [];
      if (a.removed_at && !b.removed_at) return `${item(a)} taken off the order`;
      if (a.qty !== b.qty) out.push(`${item(a)}: quantity ${num(b.qty)} → ${num(a.qty)}`);
      if (a.supplier_id !== b.supplier_id) out.push(`${item(a)} moved from ${names.supplier(str(b.supplier_id))} to ${names.supplier(str(a.supplier_id))}`);
      if (a.unit_cost_pence !== b.unit_cost_pence) {
        out.push(`${item(a)}: cost ${b.unit_cost_pence === null ? "none" : formatPence(num(b.unit_cost_pence))} → ${a.unit_cost_pence === null ? "none" : formatPence(num(a.unit_cost_pence))}`);
      }
      return out.length ? out.join(" · ") : null;
    }
    case "customer_payments": {
      if (e.action !== "insert" || !a) return null;
      const amount = num(a.amount_pence);
      const how = [METHOD[str(a.method)] ?? str(a.method), a.reference ? `ref ${str(a.reference)}` : ""].filter(Boolean).join(", ");
      return amount < 0
        ? `Refund ${formatPence(-amount)} (${how}) on ${formatShortDate(str(a.paid_on))}`
        : `Payment received ${formatPence(amount)} (${how}) on ${formatShortDate(str(a.paid_on))}`;
    }
    case "supplier_payments": {
      if (e.action !== "insert" || !a) return null;
      return `Paid ${names.supplier(str(a.supplier_id))} ${formatPence(num(a.amount_pence))} on ${formatShortDate(str(a.paid_on))}`;
    }
    case "delivery_proofs": {
      if (e.action === "insert" && a && !a.submitted_at) return "Driver link made";
      const submitted = a && a.submitted_at && !(b && b.submitted_at);
      if (submitted) return `Proof of delivery from ${BY[a.submitted_by_kind as keyof typeof BY] ?? "the driver"}`;
      return null;
    }
    case "invoices":
      return e.action === "update" && a?.voided_at && !b?.voided_at ? "Invoice voided" : null;
    default:
      return null;
  }
}

/** Short label for an audit row on the audit screen. */
export function describeAuditRow(e: AuditEntry, label?: string): string {
  const verb = e.action === "insert" ? "Added" : e.action === "update" ? "Changed" : "Removed";
  const what = (label ?? e.entity.replaceAll("_", " ")).toLowerCase();
  if (e.action !== "update") return `${verb} ${what}`;
  const keys = changedKeys(e.before, e.after);
  return `${verb} ${what}${keys.length ? `: ${keys.slice(0, 6).join(", ")}${keys.length > 6 ? "…" : ""}` : ""}`;
}
