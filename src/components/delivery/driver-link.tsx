"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Link2, MessageCircle } from "lucide-react";
import { CopyButton } from "@/components/shop/copy-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/domain/dates";
import { ProofForm, type ProofActionResult } from "./proof-form";

export type LinkResult = { url?: string; expiresAt?: string; error?: string };

/** Make (or remake) a driver link and show it once with share buttons. Supplier and admin. */
export function DriverLinkCard({ makeLink, customerName, active }: { makeLink: () => Promise<LinkResult>; customerName: string; active: { createdAt: string; expiresAt: string } | null }) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<LinkResult | null>(null);
  const generate = () => {
    if (active && !link && !window.confirm("Make a new link? The link you sent before will stop working.")) return;
    start(async () => setLink(await makeLink()));
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

/** "Upload the proof yourself": the proof form folded away under a summary line. */
export function ProofUpload({ upload, title = "Upload the proof yourself", submitLabel = "Save proof and mark delivered" }: { upload: (fd: FormData) => Promise<ProofActionResult>; title?: string; submitLabel?: string }) {
  const router = useRouter();
  return (
    <details className="group rounded-[var(--radius-lg)] border border-line bg-raised">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">{title}</summary>
      <div className="border-t border-line p-4">
        <ProofForm action={upload} submitLabel={submitLabel} onDone={() => router.refresh()} />
      </div>
    </details>
  );
}
