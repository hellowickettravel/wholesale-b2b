import { FileText, PenLine } from "lucide-react";
import { formatTimestamp } from "@/domain/dates";
import type { ProofView as Proof } from "@/server/delivery";

const BY = { driver: "the driver", supplier: "the supplier", admin: "us" } as const;

// Each proof is a small print: an enamel mount with the picture inside and its caption underneath.
const mount = "group block overflow-hidden rounded-[var(--radius-md)] border border-line bg-raised p-1.5 shadow-rest transition-shadow duration-[var(--dur-base)] hover:shadow-lift";
const caption = "flex items-center gap-1.5 px-1.5 pb-1 pt-2 text-[0.8125rem] font-bold text-ink-muted";

/** A submitted proof: photo, signed document, signature. URLs are short-lived signed links. */
export function ProofView({ proof }: { proof: Proof }) {
  return (
    <div className="space-y-3">
      <p className="text-[0.9375rem] text-ink-muted">
        Delivered {formatTimestamp(proof.submittedAt)}, recorded by {BY[proof.submittedBy]}
        {proof.signedByName ? <>; signed for by <span className="font-bold text-ink">{proof.signedByName}</span></> : null}.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {proof.photoUrl ? (
          <a href={proof.photoUrl} target="_blank" rel="noreferrer" className={mount}>
            {/* eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URL */}
            <img src={proof.photoUrl} alt="Delivery photo" className="aspect-[4/3] w-full rounded-[8px] bg-sunken object-cover" />
            <span className={caption}>Delivery photo</span>
          </a>
        ) : null}
        {proof.documentUrl ? (
          <a href={proof.documentUrl} target="_blank" rel="noreferrer" className={mount}>
            {proof.documentIsPdf ? (
              <span className="grid aspect-[4/3] place-items-center rounded-[8px] bg-sunken text-ink-muted"><FileText className="size-10" aria-hidden="true" /></span>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URL */
              <img src={proof.documentUrl} alt="Signed delivery note" className="aspect-[4/3] w-full rounded-[8px] bg-sunken object-cover" />
            )}
            <span className={caption}>Signed delivery note{proof.documentIsPdf ? " (PDF)" : ""}</span>
          </a>
        ) : null}
        {proof.signatureUrl ? (
          <div className={mount.replace("group ", "")}>
            {/* eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URL */}
            <img src={proof.signatureUrl} alt={`Signature${proof.signedByName ? ` of ${proof.signedByName}` : ""}`} className="aspect-[4/3] w-full rounded-[8px] bg-paper object-contain p-2" />
            <span className={caption}>
              <PenLine className="size-3.5" aria-hidden="true" /> Signature
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
