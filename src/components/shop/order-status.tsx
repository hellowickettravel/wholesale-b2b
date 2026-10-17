import { Badge, type Tone } from "@/components/ui/badge";
import { STATUS_LABEL, SUPPLIER_STATUS_LABEL, type OrderStatus, type SupplierOrderStatus } from "@/domain/status";

/** One status map for shop, admin and supplier: waiting = neutral, moving = blue, done = green, a problem = red. */
const ORDER_TONE: Record<OrderStatus, Tone> = {
  placed: "neutral",
  sent: "info",
  out_for_delivery: "primary",
  partially_delivered: "info",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
};

const SUPPLIER_TONE: Record<SupplierOrderStatus, Tone> = {
  placed: "neutral",
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
