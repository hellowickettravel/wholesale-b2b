"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/validation/customer";
import { echo, fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import { requireRole } from "@/server/auth";

const FIELDS = [
  "global_margin", "min_order", "delivery_charge", "delivery_vat_mode", "delivery_fixed_vat", "show_prices_inc_vat",
  "business_legal_name", "business_address", "vat_number", "bank_name", "bank_account_name", "bank_sort_code",
  "bank_account_number", "bank_iban", "invoice_footer",
];

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const values = echo(formData, FIELDS);
  const parsed = settingsSchema.safeParse({ ...Object.fromEntries(formData), delivery_days: formData.getAll("delivery_days") });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values, error: "Check the highlighted fields." };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      global_margin_bp: v.global_margin,
      min_order_pence: v.min_order,
      delivery_charge_pence: v.delivery_charge,
      delivery_vat_mode: v.delivery_vat_mode,
      delivery_fixed_vat_bp: v.delivery_fixed_vat,
      delivery_days: [...new Set(v.delivery_days)].sort(),
      show_prices_inc_vat: v.show_prices_inc_vat,
      business_legal_name: v.business_legal_name,
      business_address: v.business_address,
      vat_number: v.vat_number,
      bank_name: v.bank_name,
      bank_account_name: v.bank_account_name,
      bank_sort_code: v.bank_sort_code,
      bank_account_number: v.bank_account_number,
      bank_iban: v.bank_iban || null,
      invoice_footer: v.invoice_footer,
    })
    .eq("id", true);
  if (error) return { error: "Settings could not be saved.", values };
  revalidatePath("/admin", "layout");
  return { notice: "Settings saved." };
}
