import { Check } from "lucide-react";
import { DriverShell } from "@/components/shell/driver-shell";
import { Button } from "@/components/ui";

const steps = [
  ["Photo of the delivery", "Required. Show the goods at the door or in the kitchen.", "Take photo"],
  ["Signed delivery note", "A photo of the signed paper note, or a PDF.", "Add document"],
  ["Customer signature", "Ask the person receiving the goods to sign with a finger.", null],
] as const;

export default function DriverPreview() {
  return (
    <DriverShell>
      <div className="rounded-[var(--radius-lg)] border border-line bg-raised p-4 shadow-rest">
        <p className="text-sm font-semibold text-ink-muted">Delivering to</p>
        <p className="mt-0.5 font-display text-2xl leading-tight">Spice Route Ltd</p>
        <p className="mt-1 text-sm text-ink-muted">12 Brick Lane, London E1 6AN</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-muted">Order</dt><dd className="font-semibold">ORDER-1051</dd>
          <dt className="text-ink-muted">Lines</dt><dd>7</dd>
        </dl>
      </div>
      <ol className="mt-5 space-y-5">
        {steps.map(([title, hint, action], i) => (
          <li key={title} className="rounded-[var(--radius-lg)] border-[1.5px] border-line bg-raised p-4">
            <div className="flex items-start gap-3">
              <span className="tabular grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent text-base font-bold text-accent-ink" aria-hidden="true">
                {i === 2 ? <Check className="size-5" strokeWidth={3} /> : i + 1}
              </span>
              <div>
                <p className="font-bold leading-snug">{title}</p>
                <p className="text-sm text-ink-muted">{hint}</p>
              </div>
            </div>
            <div className="mt-3">
              {action ? (
                <Button size="lg" block variant={i === 0 ? "primary" : "secondary"} className={i === 0 ? "h-14" : ""}>{action}</Button>
              ) : (
                <div className="relative h-44 rounded-[var(--radius-md)] border-2 border-hessian bg-paper">
                  <span aria-hidden="true" className="absolute inset-x-5 bottom-9 border-b-[1.5px] border-line-strong/60" />
                  <span className="absolute inset-x-0 bottom-2.5 text-center text-sm text-ink-muted">Sign here</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <Button size="lg" block className="mt-6 h-14 text-base">Submit proof of delivery</Button>
    </DriverShell>
  );
}
