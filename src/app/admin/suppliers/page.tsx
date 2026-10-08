import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { FilterBar, FilterSearch, FilterSelect } from "@/components/admin/filter-bar";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyNote } from "@/components/admin/empty-note";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { supplierPayState } from "@/domain/ledger";
import { matchesWords, searchWords } from "@/lib/catalogue/query";
import { choiceParam, textParam } from "@/lib/list-params";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { owedBySupplierOrder } from "@/server/admin-orders";

export const metadata: Metadata = { title: "Suppliers" };

const STATUSES = [
  { value: "", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "off", label: "Switched off" },
] as const;
const SHOW = [
  { value: "", label: "All suppliers" },
  { value: "owed", label: "We owe money" },
  { value: "open", label: "Has open orders" },
] as const;
const SORTS = [
  { value: "name", label: "Name A to Z" },
  { value: "owed", label: "Most owed" },
  { value: "open", label: "Most open orders" },
] as const;

export default async function SuppliersPage({ searchParams }: PageProps<"/admin/suppliers">) {
  await requireRole("admin");
  const sp = await searchParams;
  const q = textParam(sp);
  const status = choiceParam(sp, "status", STATUSES.map((s) => s.value));
  const show = choiceParam(sp, "show", SHOW.map((s) => s.value));
  const sort = choiceParam(sp, "sort", SORTS.map((s) => s.value));
  const filtered = Boolean(q || status || show || sort !== "name");
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
  const blank = { open: 0, owed: 0, logins: 0, sizes: 0 };
  const words = searchWords(q);
  const rows = (suppliers ?? [])
    .filter((x) => matchesWords([x.name, x.email, x.phone].filter(Boolean).join(" "), words))
    .filter((x) => (status === "active" ? x.active : status === "off" ? !x.active : true))
    .filter((x) => (show === "owed" ? (stats.get(x.id)?.owed ?? 0) > 0 : show === "open" ? (stats.get(x.id)?.open ?? 0) > 0 : true))
    .sort((a, b) =>
      sort === "owed" ? (stats.get(b.id) ?? blank).owed - (stats.get(a.id) ?? blank).owed : sort === "open" ? (stats.get(b.id) ?? blank).open - (stats.get(a.id) ?? blank).open : a.name.localeCompare(b.name),
    );

  return (
    <>
      <PageHeader title="Suppliers"
        description="The wholesalers who deliver your orders, what you owe them, and who can sign in for them."
        actions={<LinkButton href="/admin/suppliers/new" size="sm" icon={<Plus className="size-4" aria-hidden="true" />}>Add supplier</LinkButton>}
      />
      <FilterBar action="/admin/suppliers" clearHref="/admin/suppliers" active={filtered}>
        <FilterSearch id="suppliers-q" label="Search" defaultValue={q} placeholder="Name, email or phone" />
        <FilterSelect id="suppliers-status" name="status" label="Status" defaultValue={status} options={STATUSES} />
        <FilterSelect id="suppliers-show" name="show" label="Show" defaultValue={show} options={SHOW} />
        <FilterSelect id="suppliers-sort" name="sort" label="Sort" defaultValue={sort} options={SORTS} />
      </FilterBar>
      <Card>
        {rows.length === 0 ? (
          filtered ? (
            <EmptyNote title="No suppliers match">Try another search or filter.</EmptyNote>
          ) : (
            <EmptyNote title="No suppliers yet" action={<LinkButton href="/admin/suppliers/new">Add a supplier</LinkButton>}>
              Add a supplier, then choose it on each product size.
            </EmptyNote>
          )
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
