import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CustomerStatusBadge } from "@/components/admin/customer-status";
import { cn } from "@/lib/cn";

/** Name, status and the Details / Pricing tabs shared by both customer pages. */
export function CustomerHeader({ id, name, status, active }: { id: string; name: string; status: string; active: "details" | "pricing" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={cn("border-b-2 px-1 pb-2.5 text-sm font-semibold", on ? "border-primary text-ink" : "border-transparent text-ink-muted hover:text-ink")}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-6">
      <Link href="/admin/customers" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Customers
      </Link>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">{name}</h1>
        <CustomerStatusBadge status={status} />
      </div>
      <nav aria-label="Customer" className="mt-4 flex gap-6 border-b border-line">
        {tab(`/admin/customers/${id}`, "Details", active === "details")}
        {tab(`/admin/customers/${id}/pricing`, "Catalogue & prices", active === "pricing")}
      </nav>
    </div>
  );
}
