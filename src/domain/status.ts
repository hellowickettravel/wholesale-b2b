/** Order / supplier-order / payment status logic. */
import type { Pence } from "./money";

export const SUPPLIER_ORDER_STATUSES = [
  "placed",
  "sent",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type SupplierOrderStatus = (typeof SUPPLIER_ORDER_STATUSES)[number];

export const ORDER_STATUSES = [
  "placed",
  "sent",
  "out_for_delivery",
  "partially_delivered",
  "delivered",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  sent: "Sent to supplier",
  out_for_delivery: "Out for delivery",
  partially_delivered: "Part delivered",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

/**
 * Roll supplier-order statuses up to the order. `completed` is set explicitly by admin
 * (delivered + paid both ways) and is not derived here.
 */
export function rollupOrderStatus(statuses: SupplierOrderStatus[]): OrderStatus {
  const live = statuses.filter((s) => s !== "cancelled");
  if (statuses.length === 0 || live.length === 0) return "cancelled";
  const delivered = live.filter((s) => s === "delivered").length;
  if (delivered === live.length) return "delivered";
  if (delivered > 0) return "partially_delivered";
  if (live.some((s) => s === "out_for_delivery")) return "out_for_delivery";
  if (live.every((s) => s === "placed")) return "placed";
  return "sent";
}

export type PaymentStatus = "unpaid" | "part_paid" | "paid" | "overpaid";

export function paymentStatus(totalPence: Pence, paidPence: Pence): PaymentStatus {
  if (paidPence <= 0) return totalPence <= 0 ? "paid" : "unpaid";
  if (paidPence < totalPence) return "part_paid";
  if (paidPence === totalPence) return "paid";
  return "overpaid";
}

/** Orders cannot be edited once any supplier order is delivered, or the order is cancelled/completed. */
export function isOrderLocked(order: { status: OrderStatus }, supplierStatuses: SupplierOrderStatus[]): boolean {
  if (order.status === "completed" || order.status === "cancelled") return true;
  return supplierStatuses.some((s) => s === "delivered");
}

/** Payment reference the restaurant puts on its bank transfer (DECISIONS D13). */
export function orderRef(number: number): string {
  return `ORDER-${number}`;
}

/** "INV-000001" */
export function invoiceRef(number: number): string {
  return `INV-${String(number).padStart(6, "0")}`;
}

export const SUPPLIER_STATUS_LABEL: Record<SupplierOrderStatus, string> = {
  placed: "Order received",
  sent: "With the supplier",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_TERMS_LABEL = {
  on_delivery: "Pay on delivery",
  within_7_days: "Within 7 days of delivery",
  on_date: "On an agreed date",
} as const;
