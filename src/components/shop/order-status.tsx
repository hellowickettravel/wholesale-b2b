import { Badge, type Tone } from "@/components/ui/badge";
import { STATUS_LABEL, SUPPLIER_STATUS_LABEL, type OrderStatus, type SupplierOrderStatus } from "@/domain/status";

/** placed: turmeric mist, with the supplier: indigo, on the road: cardamom, delivered: leaf, finished: kraft, cancelled: chilli. */
const ORDER_TONE: Record<OrderStatus, Tone> = {
  placed: "accent",
  sent: "info",
  out_for_delivery: "primary",
  partially_delivered: "warning",
  delivered: "success",
  completed: "neutral",
  cancelled: "danger",
};

const SUPPLIER_TONE: Record<SupplierOrderStatus, Tone> = {
  placed: "accent",
  sent: "info",
  out_for_delivery: "primary",
  delivered: "success",
  cancelled: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_TONE[status]} dot>{STATUS_LABEL[status]}</Badge>;
}

export function DeliveryStatusBadge({ status }: { status: SupplierOrderStatus }) {
  return <Badge tone={SUPPLIER_TONE[status]} dot>{SUPPLIER_STATUS_LABEL[status]}</Badge>;
}
