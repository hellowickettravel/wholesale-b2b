import { ChevronRight } from "lucide-react";
import { SupplierShell } from "@/components/shell/supplier-shell";
import { Badge, LinkTabs, PageHeader } from "@/components/ui";

const rows = [
  { id: "1051-A", customer: "Spice Route Ltd", postcode: "E1 6AN", date: "Tue 6 Oct", items: 7, status: "New" },
  { id: "1050-A", customer: "Curry Leaf Kitchen", postcode: "IG11 7PX", date: "Mon 5 Oct", items: 12, status: "Out for delivery" },
  { id: "1046-A", customer: "Tandoor House", postcode: "RM8 2AB", date: "Fri 2 Oct", items: 4, status: "Delivered" },
];

export default function SupplierPreview() {
  return (
    <SupplierShell supplierName="Shrivi Limited">
      <PageHeader title="Orders to deliver" description="Only orders assigned to Shrivi Limited." />
      <LinkTabs current="/styleguide/supplier" items={[{ href: "/styleguide/supplier", label: "To deliver", count: 2 }, { href: "#d", label: "Delivered", count: 31 }]} />
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
        {rows.map((r) => (
          <li key={r.id}>
            <a href="#" className="flex items-center gap-4 px-4 py-4 hover:bg-surface">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">#{r.id}</span>
                  <Badge tone={r.status === "Delivered" ? "success" : r.status === "New" ? "accent" : "primary"} dot>{r.status}</Badge>
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-muted">{r.customer} · {r.postcode} · {r.items} lines</p>
              </div>
              <div className="text-right text-sm font-semibold">{r.date}</div>
              <ChevronRight className="size-4 text-ink-subtle" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </SupplierShell>
  );
}
