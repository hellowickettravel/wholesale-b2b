import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { CostsForm } from "./costs-form";

export const metadata: Metadata = { title: "Import costs" };

export default async function ImportCostsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const [{ count: total }, { count: missing }] = await Promise.all([
    supabase.from("product_variants").select("id", { count: "exact", head: true }),
    supabase.from("product_variants").select("id", { count: "exact", head: true }).is("cost_pence", null),
  ]);
  const link = "inline-flex items-center gap-1.5 font-semibold text-primary hover:underline";
  return (
    <>
      <Link href="/admin/products" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Products
      </Link>
      <PageHeader title="Import costs"
        description={`${missing ?? 0} of ${total ?? 0} sizes still have no cost. A size cannot be ordered until it has one. Load costs for many sizes at once from a spreadsheet.`}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardBody className="py-5">
            <CostsForm />
          </CardBody>
        </Card>
        <Card className="self-start">
          <CardHeader title="How it works" />
          <CardBody className="space-y-3 text-sm text-ink-muted">
            <p><strong className="text-ink">1. Download the sheet.</strong> One row per size. Fill in the <code>cost</code> column in pounds, before VAT (for example 12.50).</p>
            <p className="flex flex-col gap-1.5">
              <a href="/admin/products/costs/sheet.csv?only=missing" download className={link}><Download className="size-4" aria-hidden="true" /> Sizes with no cost yet</a>
              <a href="/admin/products/costs/sheet.csv" download className={link}><Download className="size-4" aria-hidden="true" /> Every size (to update costs)</a>
            </p>
            <p><strong className="text-ink">2. Upload and preview.</strong> You see every change, old cost to new, before anything is saved. Big jumps are flagged.</p>
            <p><strong className="text-ink">3. Apply.</strong> Prices shown to restaurants follow the new costs straight away. Rows left blank are ignored.</p>
            <p><strong className="text-ink">A supplier&rsquo;s own list works too.</strong> A file with <code>product</code> (as the supplier writes it) and <code>cost</code> columns is matched by name, or by <code>sku</code>. Add <code>vat</code> or <code>supplier</code> columns to change those as well.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
