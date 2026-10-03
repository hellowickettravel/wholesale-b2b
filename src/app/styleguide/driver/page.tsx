import { Camera, FileUp, PenLine } from "lucide-react";
import { DriverShell } from "@/components/shell/driver-shell";
import { Button } from "@/components/ui";

export default function DriverPreview() {
  return (
    <DriverShell>
      <div className="rounded-[var(--radius-lg)] border border-line bg-raised p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Delivering to</p>
        <p className="mt-1 text-lg font-bold">Spice Route Ltd</p>
        <p className="text-sm text-ink-muted">12 Brick Lane, London E1 6AN</p>
        <p className="mt-2 text-sm"><span className="font-semibold">7 lines</span> · Order #1051-A</p>
      </div>
      <ol className="mt-5 space-y-3">
        {[
          [Camera, "Photo of the delivery", "Required"],
          [FileUp, "Signed delivery note", "Photo or PDF"],
          [PenLine, "Customer signature", "Sign on screen"],
        ].map(([Icon, title, hint], i) => {
          const I = Icon as typeof Camera;
          return (
            <li key={title as string}>
              <button type="button" className="flex w-full items-center gap-4 rounded-[var(--radius-lg)] border-2 border-dashed border-line-strong bg-raised px-4 py-5 text-left hover:border-primary">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><I className="size-6" aria-hidden="true" /></span>
                <span>
                  <span className="block font-semibold">{i + 1}. {title as string}</span>
                  <span className="text-sm text-ink-muted">{hint as string}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <Button size="lg" block className="mt-6 h-14 text-base">Submit proof of delivery</Button>
    </DriverShell>
  );
}
