import { CustomerStatusBadge } from "@/components/admin/customer-status";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";

/** Name, status and the Details / Pricing tabs shared by both customer pages. */
export function CustomerHeader({ id, name, status, active }: { id: string; name: string; status: string; active: "details" | "pricing" }) {
  const details = `/admin/customers/${id}`;
  const pricing = `/admin/customers/${id}/pricing`;
  return (
    <div className="mb-6">
      <PageHeader back={{ href: "/admin/customers", label: "Customers" }} title={name} meta={<CustomerStatusBadge status={status} />} className="pb-4" />
      <LinkTabs
        label="Customer"
        current={active === "details" ? details : pricing}
        items={[
          { href: details, label: "Details" },
          { href: pricing, label: "Catalogue & prices" },
        ]}
      />
    </div>
  );
}
