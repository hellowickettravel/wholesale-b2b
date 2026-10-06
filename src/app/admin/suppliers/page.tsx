import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyNote } from "@/components/admin/empty-note";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { supplierPayState } from "@/domain/ledger";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { owedBySupplierOrder } from "@/server/admin-orders";

export const metadata: Metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const [{ data: suppliers }, parts, { data: logins }, sizes] = await Promise.all([
    supabase.from("suppliers").select("id, name, email, phone, active").order("name"),
    fetchAll((from, to) =>
      supabase.from("admin_supplier_order_summary").select("id, supplier_id, status, paid_pence, paid_to_supplier").neq("status", "cancelled").order("id").range(from, to),
    ),
    supabase.from("profiles").select("supplier_id").eq("role", "supplier").eq("active", true),
    fetchAll((from, to) => supabase.from("product_variants").select("supplier_id").eq("active", true).order("id").range(from, to)),
  ]);
  const unpaid = parts.filter((p) => !p.paid_to_supplier);
  const owed = await owedBySupplierOrder(supabase, unpaid.map((p) => p.id!));
  const stats = new Map<string, { open: number; owed: number; logins: number; sizes: number }>();
  const get = (id: string) => stats.get(id) ?? (stats.set(id, { open: 0, owed: 0, logins: 0, sizes: 0 }), stats.get(id)!);
  for (const p of parts) if (p.status !== "delivered") get(p.supplier_id!).open++;
  for (const p of unpaid) {
    const o = owed.get(p.id!)!;
    if (p.status === "delivered" && supplierPayState(o.grossPence, p.paid_pence ?? 0, false) !== "paid") get(p.supplier_id!).owed += Math.max(0, o.grossPence - (p.paid_pence ?? 0));
  }
  for (const l of logins ?? []) if (l.supplier_id) get(l.supplier_id).logins++;
  for (const s of sizes) if (s.supplier_id) get(s.supplier_id).sizes++;
  const rows = suppliers ?? [];

  return (
    <>
      <PageHeader title="Suppliers"
        description="The wholesalers who deliver your orders, what you owe them, and who can sign in for them."
        actions={<LinkButton href="/admin/suppliers/new" size="sm" icon={<Plus className="size-4" aria-hidden="true" />}>Add supplier</LinkButton>}
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyNote title="No suppliers yet" action={<LinkButton href="/admin/suppliers/new">Add a supplier</LinkButton>}>
            Add a supplier, then choose it on each product size.
          </EmptyNote>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Supplier</TH>
                <TH className="hidden text-right md:table-cell">Sizes</TH>
                <TH className="hidden text-right sm:table-cell">Open orders</TH>
                <TH className="hidden text-right lg:table-cell">Logins</TH>
                <TH className="text-right">Owed (delivered)</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((s) => {
                const st = stats.get(s.id) ?? { open: 0, owed: 0, logins: 0, sizes: 0 };
                return (
                  <TR key={s.id}>
                    <TD>
                      <Link href={`/admin/suppliers/${s.id}`} className="group block">
                        <span className="flex flex-wrap items-center gap-2 font-medium group-hover:text-primary group-hover:underline">
                          {s.name}
                          {s.active ? null : <Badge tone="neutral">Off</Badge>}
                        </span>
                        <span className="block break-all text-[13px] text-ink-muted">{[s.email, s.phone].filter(Boolean).join(", ") || "No contact details"}</span>
                      </Link>
                    </TD>
                    <TD className="tabular hidden text-right md:table-cell">{st.sizes}</TD>
                    <TD className="tabular hidden text-right sm:table-cell">{st.open}</TD>
                    <TD className="tabular hidden text-right lg:table-cell">{st.logins}</TD>
                    <TD className="text-right">{st.owed ? <Money pence={st.owed} className="font-semibold" /> : <span className="text-ink-muted">—</span>}</TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
