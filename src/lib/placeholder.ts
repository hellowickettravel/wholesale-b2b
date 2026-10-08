/**
 * Settings start with bracketed placeholders ("[VAT number]") until the owner fills them in. Anything empty or
 * still a placeholder is "not set": invoices and order pages leave it out instead of printing the brackets.
 */
export function filled(v: string | null | undefined): string {
  const s = (v ?? "").trim();
  return s === "" || /^\[.*\]$/.test(s) ? "" : s;
}

/** Bank details are shown only when the account name, sort code and account number are all real. */
export function hasBankDetails(b: { bank_account_name?: string | null; bank_sort_code?: string | null; bank_account_number?: string | null }): boolean {
  return Boolean(filled(b.bank_account_name) && filled(b.bank_sort_code) && filled(b.bank_account_number));
}
