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

/** How to pay: bank details (each copyable), the amount, the reference to quote and the promised date. */
export function BankDetails({ bank, reference, amountPence, payBy }: { bank: BankSettings; reference: string; amountPence: number; payBy: string | null }) {
  const rows: [string, string | null, boolean][] = [
    ["Account name", bank.bank_account_name, false],
    ["Sort code", bank.bank_sort_code, true],
    ["Account number", bank.bank_account_number, true],
    ["IBAN", bank.bank_iban, true],
    ["Bank", bank.bank_name, false],
  ];
  return (
    <section aria-labelledby="pay-heading" className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised shadow-rest">
      <div className="flex items-end justify-between gap-4 border-b border-line bg-sunken px-4 py-4 sm:px-5">
        <h2 id="pay-heading" className="flex items-center gap-2.5 text-xl">
          <Landmark className="size-5 shrink-0 text-primary" aria-hidden="true" /> Pay by bank transfer
        </h2>
      </div>
      <div className="px-4 pt-4 sm:px-5">
        <p className="text-sm text-ink-muted">Amount to pay</p>
        <p className="tabular text-[1.75rem] font-bold leading-tight text-ink">{formatPence(amountPence)}</p>
      </div>
      <dl className="mt-2 divide-y divide-line px-4 sm:px-5">
        {rows
          .filter(([, v]) => v)
          .map(([k, v, copy]) => (
            <div key={k} className="flex items-center justify-between gap-3 py-1.5">
              <dt className="text-sm text-ink-muted">{k}</dt>
              <dd className="flex min-w-0 items-center gap-1 font-bold text-ink">
                <span className={copy ? "tabular break-all text-right text-lg" : "break-words text-right"}>{v}</span>
                {copy ? <CopyButton value={v!} label={k.toLowerCase()} /> : null}
              </dd>
            </div>
          ))}
        {payBy ? (
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm text-ink-muted">Pay by</dt>
            <dd className="font-bold text-ink">{formatDayDate(payBy)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="m-4 mt-2 rounded-[var(--radius-md)] bg-accent-soft p-3 sm:mx-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-accent-ink">Quote this reference</p>
            <p className="tabular text-xl font-bold text-accent-ink">{reference}</p>
          </div>
          <CopyButton value={reference} label="reference" />
        </div>
        <p className="mt-1 text-[0.8125rem] text-accent-ink">So we can match your payment to this order.</p>
      </div>
    </section>
  );
}
