import { FileText, PenLine } from "lucide-react";
import { formatTimestamp } from "@/domain/dates";
import type { ProofView as Proof } from "@/server/delivery";

const BY = { driver: "the driver", supplier: "the supplier", admin: "us" } as const;

/** A submitted proof: photo, signed document, signature. URLs are short-lived signed links. */
export function ProofView({ proof }: { proof: Proof }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Delivered {formatTimestamp(proof.submittedAt)}, recorded by {BY[proof.submittedBy]}
        {proof.signedByName ? <>; signed for by <span className="font-semibold text-ink">{proof.signedByName}</span></> : null}.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {proof.photoUrl ? (
          <a href={proof.photoUrl} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-[var(--radius-md)] border border-line bg-sunken">
            {/* eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URL */}
            <img src={proof.photoUrl} alt="Delivery photo" className="aspect-[4/3] w-full object-cover group-hover:opacity-90" />
            <span className="block px-3 py-2 text-xs font-semibold text-ink-muted">Delivery photo</span>
          </a>
        ) : null}
        {proof.documentUrl ? (
          <a href={proof.documentUrl} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-[var(--radius-md)] border border-line bg-sunken">
            {proof.documentIsPdf ? (
              <span className="grid aspect-[4/3] place-items-center text-ink-muted"><FileText className="size-10" aria-hidden="true" /></span>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URL */
              <img src={proof.documentUrl} alt="Signed delivery note" className="aspect-[4/3] w-full object-cover group-hover:opacity-90" />
            )}
            <span className="block px-3 py-2 text-xs font-semibold text-ink-muted">Signed delivery note{proof.documentIsPdf ? " (PDF)" : ""}</span>
          </a>
        ) : null}
        {proof.signatureUrl ? (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-line bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URL */}
            <img src={proof.signatureUrl} alt={`Signature${proof.signedByName ? ` of ${proof.signedByName}` : ""}`} className="aspect-[4/3] w-full object-contain p-2" />
            <span className="flex items-center gap-1.5 border-t border-line bg-sunken px-3 py-2 text-xs font-semibold text-ink-muted">
              <PenLine className="size-3.5" aria-hidden="true" /> Signature
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
