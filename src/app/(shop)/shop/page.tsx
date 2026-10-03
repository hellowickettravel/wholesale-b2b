import type { Metadata } from "next";
import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Your catalogue" };

export default async function ShopHome() {
  const viewer = await requireRole("customer");
  const supabase = await createClient();
  const { data: access } = await supabase
    .from("customer_category_access")
    .select("categories(id, name)")
    .order("created_at");
  const categories = (access ?? []).flatMap((a) => (a.categories ? [a.categories] : []));

  return (
    <>
      <PageHeader eyebrow={viewer.customer!.businessName} title="Your catalogue" description="Your account is approved. Ordering opens in the next build phases." />
      <Card>
        <CardHeader title="Categories on your account" description="Set by us when your account was approved." />
        <CardBody>
          {categories.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Badge tone="primary">{c.name}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Store className="size-4" aria-hidden="true" /> We are still setting up your catalogue.
            </p>
          )}
        </CardBody>
      </Card>
    </>
  );
}
