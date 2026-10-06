import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/server/auth";
import { createSupplier } from "../actions";
import { SupplierForm } from "../forms";

export const metadata: Metadata = { title: "Add supplier" };

export default async function NewSupplierPage() {
  await requireRole("admin");
  return (
    <>
      <Link href="/admin/suppliers" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Suppliers
      </Link>
      <PageHeader
        title="Add a supplier"
        description="Then choose it on each product size it supplies, and invite a login so it sees its orders."
      />
      <Card className="max-w-2xl">
        <CardBody>
          <SupplierForm action={createSupplier} initial={{}} submitLabel="Add supplier" />
        </CardBody>
      </Card>
    </>
  );
}
