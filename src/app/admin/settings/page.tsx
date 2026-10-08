import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { bpToInput, penceToInput } from "@/domain/money";
import { filled, hasBankDetails } from "@/lib/placeholder";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: s } = await supabase.from("settings").select("*").single();
  if (!s) throw new Error("settings row missing");
  const missing = [
    ["business name", s.business_legal_name],
    ["business address", s.business_address],
    ["VAT number", s.vat_number],
  ]
    .filter(([, v]) => !filled(v))
    .map(([k]) => k);
  return (
    <>
      <PageHeader title="Settings" description="Prices, delivery rules and the details printed on invoices." />
      {missing.length || !hasBankDetails(s) ? (
        <Alert tone="info" className="mb-6">
          Not set yet: {[...missing, ...(hasBankDetails(s) ? [] : ["bank details"])].join(", ")}. Anything left as a placeholder is simply left off invoices and
          order pages{hasBankDetails(s) ? "" : "; without bank details, customers are told you will send payment details and how to reach you"}.
        </Alert>
      ) : null}
      <div className="max-w-4xl">
        <SettingsForm
          initial={{
            global_margin: bpToInput(s.global_margin_bp),
            min_order: penceToInput(Number(s.min_order_pence)),
            delivery_charge: penceToInput(Number(s.delivery_charge_pence)),
            delivery_vat_mode: s.delivery_vat_mode,
            delivery_fixed_vat: bpToInput(s.delivery_fixed_vat_bp),
            delivery_days: s.delivery_days,
            show_prices_inc_vat: s.show_prices_inc_vat,
            business_legal_name: s.business_legal_name,
            business_address: s.business_address,
            vat_number: s.vat_number,
            bank_name: s.bank_name,
            bank_account_name: s.bank_account_name,
            bank_sort_code: s.bank_sort_code,
            bank_account_number: s.bank_account_number,
            bank_iban: s.bank_iban ?? "",
            invoice_footer: s.invoice_footer,
          }}
        />
      </div>
    </>
  );
}
