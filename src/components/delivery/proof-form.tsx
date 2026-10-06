"use client";

import { useRef, useState, useTransition } from "react";
import { Check, FileText, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { compressImage } from "@/lib/compress-image";
import { PROOF_LIMITS, PROOF_MAX_TOTAL } from "@/lib/proof-files";
import { cn } from "@/lib/cn";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";

export type ProofActionResult = { ok: true } | { ok: false; error: string; gone?: boolean };

type Picked = { blob: Blob; name: string; preview: string | null; isPdf: boolean };

/**
 * Delivery photo + signed document + on-screen signature. Photos are shrunk on the phone before
 * upload. Used by the driver page (no account) and by the supplier uploading it themselves.
 * The server re-checks everything (src/server/delivery.ts).
 */
export function ProofForm({
  action,
  submitLabel = "Submit proof of delivery",
  onDone,
}: {
  action: (formData: FormData) => Promise<ProofActionResult | void>;
  submitLabel?: string;
  onDone?: () => void;
}) {
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [doc, setDoc] = useState<Picked | null>(null);
  const [signed, setSigned] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pending, start] = useTransition();
  const pad = useRef<SignaturePadHandle>(null);

  async function pick(file: File | undefined, set: (p: Picked | null) => void, kind: "photo" | "document") {
    setError(null);
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (kind === "photo" && isPdf) return setError("The delivery photo must be a picture, not a PDF.");
    setPreparing(true);
    const blob = isPdf ? file : await compressImage(file);
    setPreparing(false);
    if (blob.size > PROOF_LIMITS[kind]) {
      return setError(isPdf ? "That PDF is too large (4 MB at most). Take a photo of the signed note instead." : "That picture is too large. Try again.");
    }
    set({ blob, name: file.name, isPdf, preview: isPdf ? null : URL.createObjectURL(blob) });
  }

  async function submit() {
    setError(null);
    if (!photo) return setError("Take a photo of the delivery.");
    const signature = await pad.current?.toBlob();
    if (!doc && !signature) return setError("Add the signed delivery note, or ask the customer to sign on screen.");
    const fd = new FormData();
    fd.set("photo", photo.blob, photo.blob.type === "image/jpeg" ? "photo.jpg" : photo.name);
    if (doc) fd.set("document", doc.blob, doc.isPdf ? "document.pdf" : doc.blob.type === "image/jpeg" ? "document.jpg" : doc.name);
    if (signature) fd.set("signature", signature, "signature.png");
    fd.set("signed_by_name", name);
    const total = photo.blob.size + (doc?.blob.size ?? 0) + (signature?.size ?? 0);
    if (total > PROOF_MAX_TOTAL) return setError("The files are too large together. Retake the photo, or use a smaller PDF.");
    start(async () => {
      try {
        const r = await action(fd);
        if (r && !r.ok) setError(r.error);
        else onDone?.();
      } catch (e) {
        // A redirect (driver page) is not an error; anything else is likely the connection.
        if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
        setError("Upload failed. Check your signal and try again.");
      }
    });
  }

  const busy = pending || preparing;

  return (
    <div className="space-y-5">
      <Step n={1} title="Photo of the delivery" hint="Required. Show the goods at the door or in the kitchen." done={Boolean(photo)}>
        <FilePick
          id="proof-photo"
          label={photo ? "Retake photo" : "Take photo"}
          primary={!photo}
          accept="image/*"
          capture
          disabled={busy}
          onPick={(f) => pick(f, setPhoto, "photo")}
        />
        {photo?.preview ? <Preview src={photo.preview} alt="Delivery photo preview" onRemove={() => setPhoto(null)} /> : null}
      </Step>

      <Step n={2} title="Signed delivery note" hint="A photo of the signed paper note, or a PDF. Optional if the customer signs below." done={Boolean(doc)}>
        <FilePick id="proof-document" label={doc ? "Replace document" : "Add document"} accept="image/*,application/pdf" disabled={busy} onPick={(f) => pick(f, setDoc, "document")} />
        {doc ? (
          doc.preview ? (
            <Preview src={doc.preview} alt="Signed document preview" onRemove={() => setDoc(null)} />
          ) : (
            <p className="mt-2 flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-sunken px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0" aria-hidden="true" /> <span className="truncate">{doc.name}</span></span>
              <button type="button" onClick={() => setDoc(null)} aria-label="Remove document" className="text-ink-muted hover:text-danger"><X className="size-4" aria-hidden="true" /></button>
            </p>
          )
        ) : null}
      </Step>

      <Step n={3} title="Customer signature" hint="Ask the person receiving the goods to sign with a finger." done={signed}>
        <SignaturePad ref={pad} label="Customer signature" onChange={setSigned} />
        <div className="mt-3 space-y-1.5">
          <label htmlFor="proof-name" className="block text-sm font-semibold text-ink">Name of the person signing (optional)</label>
          <Input id="proof-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </div>
      </Step>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button size="lg" block className="h-14 text-base" variant={photo && (doc || signed) ? "primary" : "secondary"} loading={busy} onClick={submit}>
        {preparing ? "Preparing photo…" : pending ? "Uploading…" : submitLabel}
      </Button>
    </div>
  );
}

function Step({ n, title, hint, done, children }: { n: number; title: string; hint: string; done: boolean; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className={cn("rounded-[var(--radius-lg)] border-[1.5px] bg-raised p-4 transition-colors duration-[var(--dur-base)]", done ? "border-success/50" : "border-line")}>
      <div className="flex items-start gap-3">
        {/* A real sequence, so numerals earn their place: turmeric tab, a tick once the step is done */}
        <span
          className={cn("tabular grid size-9 shrink-0 place-items-center rounded-[10px] text-base font-bold", done ? "bg-success text-primary-ink" : "bg-accent text-accent-ink")}
          aria-hidden="true"
        >
          {done ? <Check className="size-5" strokeWidth={3} /> : n}
        </span>
        <div className="min-w-0">
          <h2 id={`step-${n}`} className="font-bold leading-snug text-ink">{title}</h2>
          <p className="text-sm text-ink-muted">{hint}</p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function FilePick({ id, label, accept, capture, disabled, primary, onPick }: { id: string; label: string; accept: string; capture?: boolean; disabled?: boolean; primary?: boolean; onPick: (f: File | undefined) => void }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer select-none items-center justify-center gap-2 rounded-[var(--radius-md)] font-bold transition-[background-color,box-shadow,transform] duration-[var(--dur-instant)] ease-[var(--ease-out)] focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-focus",
        primary
          ? "h-14 bg-primary text-base text-primary-ink shadow-[var(--edge-primary)] hover:bg-primary-strong active:translate-y-[2px] active:shadow-none"
          : "h-12 border-[1.5px] border-line-strong bg-raised text-[15px] text-ink hover:bg-sunken",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {label}
      <input
        id={id}
        type="file"
        accept={accept}
        {...(capture ? { capture: "environment" as const } : {})}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function Preview({ src, alt, onRemove }: { src: string; alt: string; onRemove: () => void }) {
  return (
    <div className="relative mt-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
      <img src={src} alt={alt} className="max-h-56 w-full rounded-[var(--radius-md)] border border-line object-contain" />
      <button type="button" onClick={onRemove} aria-label={`Remove ${alt.toLowerCase()}`} className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-dark/80 text-on-dark hover:bg-dark">
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
