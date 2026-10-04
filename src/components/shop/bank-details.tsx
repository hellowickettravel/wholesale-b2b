import { Landmark } from "lucide-react";
import { formatDayDate } from "@/domain/dates";
import { formatPence } from "@/domain/money";
import { CopyButton } from "./copy-button";

export interface BankSettings {
  bank_name: string | null;
  bank_account_name: string | null;
  bank_sort_code: string | null;
  bank_account_number: string | null;
  bank_iban: string | null;
}

/** How to pay: bank details, amount, reference and the promised date. */
export function BankDetails({ bank, reference, amountPence, payBy }: { bank: BankSettings; reference: string; amountPence: number; payBy: string | null }) {
  const rows: [string, string | null, boolean][] = [
    ["Account name", bank.bank_account_name, false],
    ["Sort code", bank.bank_sort_code, true],
    ["Account number", bank.bank_account_number, true],
    ["IBAN", bank.bank_iban, true],
    ["Bank", bank.bank_name, false],
  ];
  return (
    <section aria-labelledby="pay-heading" className="rounded-[var(--radius-lg)] border border-line bg-raised p-4 sm:p-5">
      <h2 id="pay-heading" className="flex items-center gap-2 text-base font-bold">
        <Landmark className="size-4 text-primary" aria-hidden="true" /> Pay by bank transfer
      </h2>
      <dl className="mt-3 divide-y divide-line text-sm">
        {rows
          .filter(([, v]) => v)
          .map(([k, v, copy]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="flex items-center gap-1 font-semibold text-ink">
                <span className="tabular break-all text-right">{v}</span>
                {copy ? <CopyButton value={v!} label={k.toLowerCase()} /> : null}
              </dd>
            </div>
          ))}
        <div className="flex items-center justify-between gap-4 py-2">
          <dt className="text-ink-muted">Reference</dt>
          <dd className="flex items-center gap-1 font-bold text-primary-strong">
            <span className="tabular">{reference}</span>
            <CopyButton value={reference} label="reference" />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2">
          <dt className="text-ink-muted">Amount</dt>
          <dd className="tabular font-bold text-ink">{formatPence(amountPence)}</dd>
        </div>
        {payBy ? (
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-ink-muted">Pay by</dt>
            <dd className="font-semibold text-ink">{formatDayDate(payBy)}</dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-3 text-[13px] text-ink-muted">Please use the reference so we can match your payment to this order.</p>
    </section>
  );
}
