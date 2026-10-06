import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyNote } from "@/components/admin/empty-note";
import { PageHeader } from "@/components/ui/page-header";
import { formatTimestamp } from "@/domain/dates";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, business_name, contact_name, email, phone, address_line1, city, postcode, created_at")
    .eq("status", "pending")
    .order("created_at")
    .limit(200);
  const pending = data ?? [];

  return (
    <>
      <PageHeader title="Registration approvals" description="Restaurants that registered and are waiting for you. Oldest first." />
      {pending.length === 0 ? (
        <Card>
          <EmptyNote title="Nobody is waiting">New registrations appear here and in the sidebar badge.</EmptyNote>
        </Card>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {pending.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/customers/${c.id}`} className="group flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-raised p-5 transition-colors hover:border-primary">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-ink group-hover:text-primary">{c.business_name}</h2>
                    <p className="text-sm text-ink-muted">{c.contact_name ?? "No contact name"}, registered {formatTimestamp(c.created_at)}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
                    Review <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
                <ul className="grid gap-1.5 text-sm text-ink-muted sm:grid-cols-2">
                  {c.email ? <li className="flex min-w-0 items-center gap-2"><Mail className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{c.email}</span></li> : null}
                  {c.phone ? <li className="flex items-center gap-2"><Phone className="size-4 shrink-0" aria-hidden="true" />{c.phone}</li> : null}
                  {c.address_line1 || c.postcode ? (
                    <li className="flex min-w-0 items-center gap-2 sm:col-span-2"><MapPin className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{[c.address_line1, c.city, c.postcode].filter(Boolean).join(", ")}</span></li>
                  ) : null}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
