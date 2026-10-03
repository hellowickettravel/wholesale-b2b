import { formatPence, type Pence } from "@/domain/money";
import { cn } from "@/lib/cn";

export function Money({ pence, className, muted }: { pence: Pence; className?: string; muted?: boolean }) {
  return <span className={cn("tabular whitespace-nowrap", muted && "text-ink-muted", className)}>{formatPence(pence)}</span>;
}
