"use client";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { formatBp, formatPence } from "@/domain/money";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { importCosts, type CostImportState } from "./actions";

const MAX_BYTES = 2 * 1024 * 1024;

export function CostsForm() {
  const [state, action, pending] = useActionState<CostImportState, FormData>(importCosts, {});
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  // A preview echoes the file back; use it unless the admin has chosen another file since.
  const text = csv || state.csv || "";
  const r = state.result;
  const previewed = r && !r.applied;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="csv" value={text} />
      <input type="hidden" name="fileName" value={fileName || state.fileName || ""} />

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-ink">Cost file (CSV)</span>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-line-strong bg-surface px-4 py-8 text-center hover:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30">
          <FileSpreadsheet className="size-8 text-primary" aria-hidden="true" />
          <span className="text-sm font-semibold text-ink">{fileName || state.fileName || "Choose a CSV file"}</span>
          <span className="text-xs text-ink-muted">The price sheet you downloaded, or any list with a cost column. Max 2 MB.</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              setFileError(null);
              if (!f) return;
              if (f.size > MAX_BYTES) {
                setFileError("That file is over 2 MB. Split it into smaller files.");
                return;
              }
              setFileName(f.name);
              setCsv(await f.text());
            }}
          />
        </label>
        {fileError ? <p className="text-[13px] font-medium text-danger">{fileError}</p> : null}
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="mode" value="preview" variant={previewed ? "secondary" : "primary"} loading={pending} disabled={!text} icon={<Upload className="size-4" aria-hidden="true" />}>
          {previewed ? "Preview again" : "Preview changes"}
        </Button>
        {previewed && r.changeCount > 0 ? (
          <Button type="submit" name="mode" value="apply" loading={pending} disabled={!text} icon={<CheckCircle2 className="size-4" aria-hidden="true" />}>
            Apply {r.changeCount} {r.changeCount === 1 ? "change" : "changes"}
          </Button>
        ) : null}
      </div>

      {r ? <Report result={r} /> : null}
    </form>
  );
}

function Report({ result: r }: { result: NonNullable<CostImportState["result"]> }) {
  const skipped = r.notFound.length + r.ambiguous.length + r.unknownSupplier.length + r.errors.filter((e) => e.line > 1).length;
  return (
    <section aria-label="Import report" className="space-y-4 border-t border-line pt-6">
      {r.applied ? (
        <Alert tone="success" title="Costs saved">
          Updated {r.updated} {r.updated === 1 ? "size" : "sizes"}. Every change is in the{" "}
          <Link href="/admin/audit" className="font-semibold underline">audit log</Link>. Sizes with a cost can now be ordered:{" "}
          <Link href="/admin/products?status=needs-price" className="font-semibold underline">see what still needs a price</Link>.
        </Alert>
      ) : r.changeCount === 0 ? (
        <Alert tone="info" title="Nothing to change">Every cost in this file already matches the catalogue, or no row could be matched.</Alert>
      ) : (
        <Alert tone="info" title="Preview only: nothing has been saved yet">Check the list below, then press Apply.</Alert>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Rows read", r.rowCount],
          [r.applied ? "Updated" : "Will change", r.applied ? r.updated : r.changeCount],
          ["Already the same", r.unchanged],
          ["Skipped", skipped],
        ].map(([label, n]) => (
          <div key={label} className="rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3">
            <dt className="text-xs font-medium text-ink-muted">{label}</dt>
            <dd className="tabular text-2xl font-bold text-ink">{n}</dd>
          </div>
        ))}
      </dl>
      {r.blank ? <p className="text-sm text-ink-muted">{r.blank} {r.blank === 1 ? "row has" : "rows have"} no cost yet and {r.blank === 1 ? "was" : "were"} left alone.</p> : null}

      {r.notFound.length ? (
        <Alert tone="warning" title={`${r.notFound.length} ${r.notFound.length === 1 ? "row" : "rows"} did not match any size`}>
          <ul className="list-disc pl-4">{r.notFound.slice(0, 40).map((n) => <li key={`${n.line}-${n.label}`}>Line {n.line}: {n.label}</li>)}</ul>
          Check the spelling, or use the downloaded price sheet (its variant_id column always matches).
        </Alert>
      ) : null}
      {r.ambiguous.length ? (
        <Alert tone="warning" title={`${r.ambiguous.length} ${r.ambiguous.length === 1 ? "row matches" : "rows match"} more than one size`}>
          <ul className="list-disc pl-4">{r.ambiguous.slice(0, 40).map((n) => <li key={`${n.line}-${n.label}`}>Line {n.line}: {n.label} ({n.matches} sizes). Add the category or use variant_id.</li>)}</ul>
        </Alert>
      ) : null}
      {r.unknownSupplier.length ? (
        <Alert tone="warning" title="Unknown supplier names">
          <ul className="list-disc pl-4">{r.unknownSupplier.slice(0, 40).map((n) => <li key={`${n.line}-${n.supplier}`}>Line {n.line}: &ldquo;{n.supplier}&rdquo; for {n.label}. Add the supplier first.</li>)}</ul>
        </Alert>
      ) : null}
      {r.errors.length ? (
        <Alert tone="danger" title={`${r.errors.length} ${r.errors.length === 1 ? "row was" : "rows were"} not read`}>
          <ul className="list-disc pl-4">{r.errors.slice(0, 40).map((e) => <li key={`${e.line}-${e.message}`}>{e.line ? `Line ${e.line}: ` : ""}{e.message}</li>)}</ul>
        </Alert>
      ) : null}
      {r.repeated.length ? (
        <Alert tone="info" title={`${r.repeated.length} ${r.repeated.length === 1 ? "size appears" : "sizes appear"} more than once (the last row wins)`}>
          {r.repeated.slice(0, 20).map((n) => n.label).join(", ")}
        </Alert>
      ) : null}

      {r.changes.length ? (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-line">
          <ul className="divide-y divide-line">
            {r.changes.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 text-sm font-medium text-ink">{c.label}</p>
                <p className="tabular flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted sm:justify-end">
                  <span>{c.oldCostPence === null ? "no cost" : formatPence(c.oldCostPence)} → <strong className="text-ink">{formatPence(c.newCostPence)}</strong></span>
                  {c.vatBp !== undefined ? <span>VAT {formatBp(c.oldVatBp ?? 0)} → {formatBp(c.vatBp)}</span> : null}
                  {c.supplierName ? <span>supplier → {c.supplierName}</span> : null}
                  {c.big ? <Badge tone="warning">Big change</Badge> : null}
                  {c.oldCostPence === null ? <Badge tone="primary">New</Badge> : null}
                </p>
              </li>
            ))}
          </ul>
          {r.changeCount > r.changes.length ? <p className="border-t border-line px-4 py-2 text-xs text-ink-muted">Showing the first {r.changes.length} of {r.changeCount}. All of them are applied.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
