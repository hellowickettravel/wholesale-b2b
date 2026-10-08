import type { Metadata } from "next";
import { KeyRound, Mail, MapPin, Phone, Store, UserRound } from "lucide-react";
import { brand, whatsappHref } from "@/config/brand";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { ShopTitle } from "@/components/shop/page-title";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const viewer = await requireRole("customer");
  const { notice } = await searchParams;
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("customers")
    .select("business_name, contact_name, phone, address_line1, address_line2, city, postcode")
    .eq("id", viewer.customer!.id)
    .single();
  const name = c?.business_name ?? viewer.customer!.businessName;
  const rows = [
    { icon: UserRound, label: "Contact", value: c?.contact_name },
    { icon: Mail, label: "Email (your sign-in)", value: viewer.email },
    { icon: Phone, label: "Phone", value: c?.phone },
    { icon: MapPin, label: "Delivery address", value: [c?.address_line1, c?.address_line2, c?.city, c?.postcode].filter(Boolean).join(", ") },
  ];
  return (
    <div className="mx-auto max-w-3xl lg:mx-0">
      <ShopTitle>My account</ShopTitle>
      {notice === "password" ? <Alert tone="success" className="mb-5">Your new password is saved.</Alert> : null}

      <div className="flex items-center gap-4 rounded-[var(--radius-xl)] bg-primary p-5 text-on-dark-muted sm:p-6" data-surface="dark">
        <span className="grid size-14 shrink-0 place-items-center rounded-[var(--radius-lg)] bg-white/10 text-on-dark ring-1 ring-white/15">
          <Store className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-sun">Trade account</p>
          <p className="truncate font-display text-[clamp(1.375rem,1.1rem+1.2vw,1.875rem)] font-bold leading-tight text-on-dark">{name}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section aria-labelledby="details-heading" className="rounded-[var(--radius-lg)] border border-line bg-raised p-5 shadow-rest sm:p-6">
          <h2 id="details-heading" className="text-lg">Your details</h2>
          <dl className="mt-3 divide-y divide-line">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-3 py-3.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="break-words font-semibold text-ink">{value || "Not set"}</dd>
                </div>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-ink-muted">
            Something wrong? Message us on{" "}
            <a className="font-semibold text-primary hover:underline" href={whatsappHref(`Hello, please update the details for ${name}.`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>{" "}
            or email <a className="font-semibold text-primary hover:underline" href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>.
          </p>
        </section>

        <div className="space-y-5">
          <section aria-labelledby="password-heading" className="rounded-[var(--radius-lg)] border border-line bg-raised p-5 shadow-rest sm:p-6">
            <h2 id="password-heading" className="flex items-center gap-2 text-lg">
              <KeyRound className="size-4 text-ink-subtle" aria-hidden="true" /> Change password
            </h2>
            <div className="mt-4">
              <SetPasswordForm submitLabel="Save new password" from="account" autoFocus={false} />
            </div>
          </section>
          <a
            href={whatsappHref(`Hello, this is ${name}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-raised p-4 shadow-rest transition-colors hover:border-[#25D366]"
          >
            <span className="grid size-10 place-items-center rounded-full bg-[#E7F8EE] text-[#128C4A]">
              <WhatsAppIcon className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-ink">Need help with an order?</span>
              <span className="text-sm text-ink-muted">WhatsApp {brand.contact.phoneDisplay}</span>
            </span>
          </a>
        </div>
      </div>

      <div className="mt-6">
        <SignOutButton className={buttonClasses({ variant: "secondary" })} />
      </div>
    </div>
  );
}
