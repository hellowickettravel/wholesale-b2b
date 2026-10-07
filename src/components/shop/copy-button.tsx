"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked: the value is on screen to copy by hand */
        }
      }}
      className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] text-ink-muted transition-colors duration-[var(--dur-instant)] hover:bg-sunken hover:text-ink active:bg-primary-soft"
    >
      {copied ? <Check className="size-[18px] text-success motion-safe:animate-[ui-fade-in_var(--dur-fast)_var(--ease-out)_both]" strokeWidth={3} aria-hidden="true" /> : <Copy className="size-[18px]" aria-hidden="true" />}
    </button>
  );
}
