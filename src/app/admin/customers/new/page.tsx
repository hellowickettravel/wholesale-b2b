import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/server/auth";
import { createCustomer } from "../actions";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "Add customer" };

const EMPTY = { business_name: "", contact_name: "", email: "", phone: "", address_line1: "", address_line2: "", city: "", postcode: "", delivery_notes: "" };

export default async function NewCustomerPage({ searchParams }: PageProps<"/admin/customers/new">) {
  await requireRole("admin");
  const invite = (await searchParams).invite === "1";
  if (invite) {
    return (
      <>
        <Link href="/admin/customers" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" /> Customers
        </Link>
        <PageHeader title="Invite a customer"
          description="Open a trade account for a restaurant in one step. It is approved straight away with every category. Add their delivery address and prices from their page afterwards."
        />
        <Card className="max-w-2xl">
          <CardBody className="py-5">
            <CustomerForm action={createCustomer} initial={EMPTY} submitLabel="Create account" withInvite inviteOnly />
          </CardBody>
        </Card>
      </>
    );
  }
  return (
    <>
      <Link href="/admin/customers" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Customers
      </Link>
      <PageHeader title="Add a restaurant"
        description="For restaurants you already trade with. They are approved straight away with every category; adjust their catalogue and prices next."
      />
      <Card className="max-w-2xl">
        <CardBody className="py-5">
          <CustomerForm action={createCustomer} initial={EMPTY} submitLabel="Add restaurant" withInvite />
        </CardBody>
      </Card>
    </>
  );
}
