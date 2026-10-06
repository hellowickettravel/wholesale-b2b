import type { Metadata } from "next";
import { ShopTitle } from "@/components/shop/page-title";
import { buttonClasses } from "@/components/ui/button";
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
    ["Contact", c?.contact_name],
    ["Email", viewer.email],
    ["Phone", c?.phone],
    ["Delivery address", [c?.address_line1, c?.address_line2, c?.city, c?.postcode].filter(Boolean).join(", ")],
  ];
  return (
    <div className="mx-auto max-w-2xl lg:mx-0">
      <ShopTitle>My account</ShopTitle>
      {/* Who this account is: the business name on a plate. */}
      <div data-ground="" data-weave="b" className="weave rounded-[var(--radius-xl)] px-4 py-6 sm:px-8 sm:py-8">
        <div className="plate inline-block max-w-full px-6 py-4 sm:px-8">
          <p className="text-sm text-ink-muted">Trade account</p>
          <p className="text-balance font-display text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] leading-[1.1]">{c?.business_name ?? viewer.customer!.businessName}</p>
        </div>
      </div>
      <section aria-labelledby="details-heading" className="mt-5 rounded-[var(--radius-lg)] border border-line bg-raised p-5 shadow-rest sm:p-6">
        <h2 id="details-heading" className="text-xl">Your details</h2>
        <p className="mt-1 text-sm text-ink-muted">To change any of these, contact us.</p>
        <dl className="mt-3 divide-y divide-line">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-0.5 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
              <dt className="text-sm text-ink-muted">{k}</dt>
              <dd className="font-semibold text-ink">{v || "Not set"}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="mt-6">
        <SignOutButton className={buttonClasses({ variant: "secondary", className: "!text-base !font-bold" })} />
      </div>
    </div>
  );
}
