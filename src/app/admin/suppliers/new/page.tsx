import type { Metadata } from "next";
import Link from "next/link";
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
      <PageHeader
        eyebrow={<Link href="/admin/suppliers" className="hover:text-ink">Suppliers</Link>}
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
