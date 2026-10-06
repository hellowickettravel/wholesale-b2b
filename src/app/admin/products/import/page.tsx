import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import products" };

export default async function ImportPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: suppliers } = await supabase.from("suppliers").select("id, name").eq("active", true).order("name");
  const shrivi = (suppliers ?? []).find((s) => /shrivi/i.test(s.name));

  return (
    <>
      <Link href="/admin/products" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Products
      </Link>
      <PageHeader title="Import products"
        description="Load a supplier's list. Pack sizes are read from the item names and grouped into one product per item. Costs are never imported."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardBody className="py-5">
            <ImportForm suppliers={suppliers ?? []} defaultSupplierId={shrivi?.id ?? ""} />
          </CardBody>
        </Card>
        <Card className="self-start">
          <CardHeader title="How it works" />
          <CardBody className="space-y-3 text-sm text-ink-muted">
            <p><strong className="text-ink">Safe to repeat.</strong> Products and sizes already in the catalogue are left exactly as you edited them; only missing ones are added.</p>
            <p><strong className="text-ink">Sizes are grouped.</strong> &ldquo;BASMATI RICE 5 KG&rdquo; and &ldquo;BASMATI RICE 20 KG&rdquo; in the same category become one product with two sizes.</p>
            <p><strong className="text-ink">No prices.</strong> New sizes show as &ldquo;needs price&rdquo; and cannot be ordered until you add a cost.</p>
            <a href="/import-template.csv" download className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
              <Download className="size-4" aria-hidden="true" /> Download a template
            </a>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
