import { MapPin, Phone } from "lucide-react";
import { Message } from "@/components/delivery/message";
import { formatDayDate, formatTimestamp } from "@/domain/dates";
import { orderRef } from "@/domain/status";
import { clientIp, hit } from "@/server/rate-limit";
import { findDriverJob, type DriverJob } from "@/server/delivery";
import { DriverForm } from "./driver-form";

export const dynamic = "force-dynamic";

export default async function DriverPage({ params }: PageProps<"/d/[token]">) {
  const { token } = await params;
  if (!(await hit("driverViewPerIp", await clientIp()))) {
    return <Message tone="warning" title="Too many attempts">Wait a few minutes, then open the link again.</Message>;
  }
  const job = await findDriverJob(token);
  if (!job) {
    return <Message tone="warning" title="This link is not valid">Check you opened the whole link from the supplier, or ask them to send it again.</Message>;
  }
  if (job.state !== "open") return <Closed job={job} />;

  return (
    <div className="space-y-5">
      <Job job={job} />
      <DriverForm token={token} />
      <p className="text-center text-xs text-ink-muted">
        This link works once and expires {job.expiresAt ? formatTimestamp(job.expiresAt) : "soon"}.
      </p>
    </div>
  );
}

function Job({ job }: { job: DriverJob }) {
  const units = job.lines.reduce((a, l) => a + l.qty, 0);
  return (
    <section aria-labelledby="job-heading" className="rounded-[var(--radius-lg)] border border-line bg-raised p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Delivering to</p>
      <h1 id="job-heading" className="mt-1 text-xl font-bold">{job.customerName}</h1>
      <p className="mt-1 flex items-start gap-2 text-sm text-ink-muted">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {job.address}
      </p>
      {job.phone ? (
        <a href={`tel:${job.phone.replace(/[^\d+]/g, "")}`} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <Phone className="size-4" aria-hidden="true" /> {job.contactName ? `${job.contactName}, ` : ""}{job.phone}
        </a>
      ) : null}
      <p className="mt-3 text-sm">
        <span className="font-semibold">{formatDayDate(job.deliveryDate)}</span> · {orderRef(job.orderNumber)} · {job.supplierName}
      </p>
      {job.note ? <p className="mt-2 rounded-[var(--radius-md)] bg-accent-soft px-3 py-2 text-sm text-accent-ink">Note: {job.note}</p> : null}
      <details className="mt-3 rounded-[var(--radius-md)] border border-line">
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
          {job.lines.length} {job.lines.length === 1 ? "line" : "lines"}, {units} {units === 1 ? "item" : "items"}
        </summary>
        <ul className="divide-y divide-line border-t border-line text-sm">
          {job.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-3 px-3 py-2">
              <span className="min-w-0">{l.productName} <span className="text-ink-muted">· {l.sizeLabel}</span></span>
              <span className="tabular shrink-0 font-semibold">× {l.qty}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function Closed({ job }: { job: DriverJob }) {
  switch (job.state) {
    case "used":
      return (
        <Message tone="success" title="Delivery already recorded">
          Proof for {job.customerName} was sent {job.submittedAt ? formatTimestamp(job.submittedAt) : "earlier"}. Thank you.
        </Message>
      );
    case "expired":
      return <Message tone="warning" title="This link has expired">Ask {job.supplierName || "the supplier"} to send you a new link.</Message>;
    case "revoked":
      return <Message tone="warning" title="A newer link was sent">Use the latest link {job.supplierName || "the supplier"} sent you.</Message>;
    default:
      return <Message tone="warning" title="Nothing to record">This delivery is already recorded or was cancelled. Check with {job.supplierName || "the supplier"}.</Message>;
  }
}
