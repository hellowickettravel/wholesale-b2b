import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const viewer = await requireRole("customer");
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("customers")
    .select("business_name, contact_name, phone, address_line1, address_line2, city, postcode")
    .eq("id", viewer.customer!.id)
    .single();
  const rows: [string, string | null | undefined][] = [
    ["Business", c?.business_name],
    ["Contact", c?.contact_name],
    ["Email", viewer.email],
    ["Phone", c?.phone],
    ["Delivery address", [c?.address_line1, c?.address_line2, c?.city, c?.postcode].filter(Boolean).join(", ")],
  ];
  return (
    <>
      <PageHeader title="My account" />
      <Card>
        <CardHeader title="Your details" description="Contact us to change these. Editing here arrives in a later phase." />
        <CardBody>
          <dl className="divide-y divide-line">
            {rows.map(([k, v]) => (
              <div key={k} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]">
                <dt className="text-sm text-ink-muted">{k}</dt>
                <dd className="text-[15px] text-ink">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>
      <div className="mt-6">
        <SignOutButton className="h-11 rounded-[var(--radius-md)] border border-line-strong bg-raised px-4 text-ink hover:bg-sunken" />
      </div>
    </>
  );
}
