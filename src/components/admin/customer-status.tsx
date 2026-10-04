import { Badge, type Tone } from "@/components/ui/badge";

export const CUSTOMER_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Awaiting approval", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "On hold", tone: "neutral" },
};

export function CustomerStatusBadge({ status }: { status: string }) {
  const s = CUSTOMER_STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}
