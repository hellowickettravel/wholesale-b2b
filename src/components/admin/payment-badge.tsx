import { Badge, type Tone } from "@/components/ui/badge";

export type PaymentState = "unpaid" | "part_paid" | "paid" | "overpaid" | "cancelled";

const LABEL: Record<PaymentState, string> = {
  unpaid: "Unpaid",
  part_paid: "Part paid",
  paid: "Paid",
  overpaid: "Overpaid",
  cancelled: "Cancelled",
};
const TONE: Record<PaymentState, Tone> = {
  unpaid: "warning",
  part_paid: "info",
  paid: "success",
  overpaid: "danger",
  cancelled: "neutral",
};

/** The restaurant's payment state for an order (admin_order_summary.payment_state). */
export function PaymentBadge({ state }: { state: string | null | undefined }) {
  const s = (state && state in LABEL ? state : "unpaid") as PaymentState;
  return <Badge tone={TONE[s]}>{LABEL[s]}</Badge>;
}

const SUPPLIER_LABEL = { unpaid: "Not paid", part_paid: "Part paid", paid: "Paid" } as const;
const SUPPLIER_TONE: Record<keyof typeof SUPPLIER_LABEL, Tone> = { unpaid: "warning", part_paid: "info", paid: "success" };

/** Whether the admin has paid a supplier for its part. */
export function SupplierPayBadge({ state }: { state: keyof typeof SUPPLIER_LABEL }) {
  return <Badge tone={SUPPLIER_TONE[state]}>{SUPPLIER_LABEL[state]}</Badge>;
}
