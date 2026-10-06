"use client";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { importCatalogue, type ImportState } from "./actions";

const MAX_BYTES = 2 * 1024 * 1024;

export function ImportForm({ suppliers, defaultSupplierId }: { suppliers: { id: string; name: string }[]; defaultSupplierId: string }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importCatalogue, {});
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState(defaultSupplierId);
  // A preview echoes the file back; use it unless the admin has chosen another file since.
  const text = csv || state.csv || "";
  const r = state.result;
  const previewed = r && !r.applied;

  return (
    // Submitted by hand (see sizes-editor.tsx): an automatic form reset would put the supplier
    // <select> back to "New supplier…" between preview and import.
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <span className="block text-sm font-medium text-ink">CSV file</span>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-line-strong bg-surface px-4 py-8 text-center hover:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30">
            <FileSpreadsheet className="size-8 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink">{fileName || state.fileName || "Choose a CSV file"}</span>
            <span className="text-xs text-ink-muted">Columns: category, name, and optionally size, sku, vat, description. Max 2 MB.</span>
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
        <Field label="Supplier for these products" hint="Every new size is linked to this supplier.">
          {(p) => (
            <Select {...p} name="supplier_id" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">New supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Source label" hint="Recorded on each new product, e.g. shrivi_items.">
          {(p) => <Input {...p} name="source" defaultValue={state.source ?? "csv"} />}
        </Field>
        {supplierId === "" ? (
          <Field label="New supplier name" hint="Created when you press Import.">
            {(p) => <Input {...p} name="new_supplier" defaultValue="Shrivi Limited" />}
          </Field>
        ) : null}
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="mode" value="preview" variant={previewed ? "secondary" : "primary"} loading={pending} disabled={!text} icon={<Upload className="size-4" aria-hidden="true" />}>
          {previewed ? "Preview again" : "Preview import"}
        </Button>
        {previewed && (r.productsCreated > 0 || r.variantsCreated > 0) ? (
          <Button type="submit" name="mode" value="import" loading={pending} disabled={!text} icon={<CheckCircle2 className="size-4" aria-hidden="true" />}>
            Import {r.productsCreated} products and {r.variantsCreated} sizes
          </Button>
        ) : null}
      </div>

      {r ? <ImportReport result={r} /> : null}
    </form>
  );
}

function ImportReport({ result: r }: { result: NonNullable<ImportState["result"]> }) {
  const nothingNew = r.productsCreated === 0 && r.variantsCreated === 0 && r.categoriesCreated.length === 0;
  return (
    <section aria-label="Import report" className="space-y-4 border-t border-line pt-6">
      {r.applied ? (
        <Alert tone="success" title="Import finished">
          Added {r.productsCreated} products and {r.variantsCreated} sizes. They have no cost yet:{" "}
          <Link href="/admin/products?status=needs-price" className="font-semibold underline">see products that need a price</Link>.
        </Alert>
      ) : nothingNew ? (
        <Alert tone="info" title="Nothing new to import">Every product and size in this file is already in the catalogue.</Alert>
      ) : (
        <Alert tone="info" title="Preview only: nothing has been saved yet">Check the list below, then press Import.</Alert>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Rows read", r.rowCount],
          ["New products", r.productsCreated],
          ["New sizes", r.variantsCreated],
          ["Already there", r.productsMatched],
        ].map(([label, n]) => (
          <div key={label} className="rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3">
            <dt className="text-xs font-medium text-ink-muted">{label}</dt>
            <dd className="tabular text-2xl font-bold text-ink">{n}</dd>
          </div>
        ))}
      </dl>

      {r.categoriesCreated.length ? (
        <Alert tone="warning" title={`${r.categoriesCreated.length} new ${r.categoriesCreated.length === 1 ? "category" : "categories"}`}>
          {r.categoriesCreated.join(", ")}. If one is a spelling of an existing category, fix the file instead.
        </Alert>
      ) : null}
      {r.errors.length ? (
        <Alert tone="danger" title={`${r.errors.length} ${r.errors.length === 1 ? "row was" : "rows were"} skipped`}>
          <ul className="list-disc pl-4">
            {r.errors.slice(0, 50).map((e) => (
              <li key={`${e.line}-${e.message}`}>{e.line ? `Line ${e.line}: ` : ""}{e.message}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {r.noSize.length ? (
        <Alert tone="warning" title={`${r.noSize.length} without a pack size (added as "Each")`}>{r.noSize.slice(0, 30).join(", ")}</Alert>
      ) : null}
      {r.duplicates.length ? (
        <Alert tone="info" title={`${r.duplicates.length} duplicate ${r.duplicates.length === 1 ? "row" : "rows"} ignored`}>{r.duplicates.slice(0, 30).join(", ")}</Alert>
      ) : null}

      {r.preview.length ? (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-line">
          <ul className="divide-y divide-line">
            {r.preview.map((p) => (
              <li key={`${p.category}-${p.name}`} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {p.name} {p.isNew ? <Badge tone="primary">New</Badge> : <Badge tone="neutral">Exists</Badge>}
                  </p>
                  <p className="text-[13px] text-ink-muted">{p.category}</p>
                </div>
                <div className="flex flex-wrap gap-1 sm:justify-end">
                  {p.sizes.map((s) => (
                    <Badge key={s.label} tone={s.isNew ? "accent" : "neutral"}>{s.label}</Badge>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {r.preview.length >= 200 ? <p className="border-t border-line px-4 py-2 text-xs text-ink-muted">Showing the first 200 products.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
