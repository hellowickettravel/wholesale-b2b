"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Link2, MessageCircle, Send, Truck } from "lucide-react";
import { ProofForm } from "@/components/delivery/proof-form";
import { CopyButton } from "@/components/shop/copy-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/domain/dates";
import { newDriverLink, setStatus, uploadOwnProof, type LinkResult } from "./actions";

export function StatusButtons({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (s: "sent" | "out_for_delivery") =>
    start(async () => {
      setError(null);
      const r = await setStatus(id, s);
      if (r.error) setError(r.error);
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "placed" ? (
          <Button onClick={() => run("sent")} loading={pending} icon={<Send className="size-4" aria-hidden="true" />}>Accept order</Button>
        ) : null}
        {status === "placed" || status === "sent" ? (
          <Button variant={status === "placed" ? "secondary" : "primary"} onClick={() => run("out_for_delivery")} loading={pending} icon={<Truck className="size-4" aria-hidden="true" />}>
            Mark out for delivery
          </Button>
        ) : null}
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}

export function DriverLinkCard({ id, customerName, active }: { id: string; customerName: string; active: { createdAt: string; expiresAt: string } | null }) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<LinkResult | null>(null);
  const generate = () => {
    if (active && !link && !window.confirm("Make a new link? The link you sent before will stop working.")) return;
    start(async () => setLink(await newDriverLink(id)));
  };
  const message = link?.url ? `Delivery to ${customerName}: open this link to send the photo and signature once delivered. ${link.url}` : "";

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Send your driver a link. On their phone they take a photo, add the signed note or the customer&apos;s signature, and submit. No login needed; the link works once and expires after 72 hours.
      </p>
      {link?.url ? (
        <div className="space-y-2 rounded-[var(--radius-md)] border border-primary/30 bg-primary-soft/40 p-3">
          <p className="text-sm font-semibold text-ink">New driver link (shown once: send it now)</p>
          <div className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-line bg-raised pl-3">
            <code className="min-w-0 flex-1 truncate text-[13px]" data-testid="driver-link">{link.url}</code>
            <CopyButton value={link.url} label="driver link" />
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] bg-[#25D366] px-3 text-sm font-semibold text-white hover:brightness-95" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
            </a>
            <a className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-line-strong bg-raised px-3 text-sm font-semibold text-ink hover:bg-sunken" href={`sms:?&body=${encodeURIComponent(message)}`}>
              Text message
            </a>
          </div>
          {link.expiresAt ? <p className="text-xs text-ink-muted">Works until {formatTimestamp(link.expiresAt)}.</p> : null}
        </div>
      ) : active ? (
        <p className="rounded-[var(--radius-md)] bg-sunken px-3 py-2 text-sm text-ink">
          A link made {formatTimestamp(active.createdAt)} is waiting to be used (until {formatTimestamp(active.expiresAt)}).
        </p>
      ) : null}
      {link?.error ? <Alert tone="danger">{link.error}</Alert> : null}
      <Button variant={link?.url || active ? "secondary" : "primary"} onClick={generate} loading={pending} icon={<Link2 className="size-4" aria-hidden="true" />}>
        {active || link?.url ? "Make a new link" : "Make driver link"}
      </Button>
    </div>
  );
}

export function OwnProof({ id }: { id: string }) {
  const router = useRouter();
  return (
    <details className="group rounded-[var(--radius-lg)] border border-line bg-raised">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">Upload the proof yourself</summary>
      <div className="border-t border-line p-4">
        <ProofForm action={(fd) => uploadOwnProof(id, fd)} submitLabel="Save proof and mark delivered" onDone={() => router.refresh()} />
      </div>
    </details>
  );
}
