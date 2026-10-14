import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { filled, hasBankDetails } from "@/lib/placeholder";
import { createClient } from "@/lib/supabase/server";
import { mailerConfigured } from "@/server/mailer";

/** What still has to be done before real customers can order and be invoiced. Renders nothing once everything is done. */
export async function SetupChecklist() {
  const supabase = await createClient();
  const [{ count: noCost }, { data: settings }, { data: factors }, { count: waiting }] = await Promise.all([
    supabase.from("product_variants").select("id", { count: "exact", head: true }).eq("active", true).is("cost_pence", null),
    supabase.from("settings").select("vat_number, business_address, bank_account_name, bank_sort_code, bank_account_number").maybeSingle(),
    supabase.auth.mfa.listFactors(),
    supabase.from("email_log").select("id", { count: "exact", head: true }).eq("status", "queued"),
  ]);
  const items: { text: string; href: string; action: string }[] = [];
  if (noCost) items.push({ text: `${noCost} ${noCost === 1 ? "size has" : "sizes have"} no cost, so restaurants see "Price on request" and cannot order ${noCost === 1 ? "it" : "them"}.`, href: "/admin/products/costs", action: "Import costs" });
  if (!filled(settings?.vat_number)) items.push({ text: "No VAT number is set, but invoices charge VAT. Add your VAT number, or switch VAT off on the products you sell without it.", href: "/admin/settings", action: "Open settings" });
  if (!filled(settings?.business_address) || !(settings && hasBankDetails(settings))) items.push({ text: "Business address or bank details are missing, so invoices cannot tell restaurants where to pay.", href: "/admin/settings", action: "Open settings" });
  if (!factors?.totp?.length) items.push({ text: "Two-step sign-in is off for this admin account.", href: "/admin/security", action: "Turn it on" });
  if (!mailerConfigured()) items.push({ text: `Email is not set up, so order, approval and supplier emails are not being sent${waiting ? ` (${waiting} waiting)` : ""}.`, href: "/admin/emails", action: "See how" });
  if (items.length === 0) return null;
  return (
    <Card className="mb-6">
      <CardHeader title="Before you go live" description={`${items.length} ${items.length === 1 ? "thing" : "things"} still to do.`} />
      <CardBody className="p-0">
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={i.text} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
              <p className="flex min-w-0 items-start gap-2 text-sm text-ink"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" /> {i.text}</p>
              <Link href={i.href} className="shrink-0 text-sm font-semibold text-primary hover:underline">{i.action}</Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

