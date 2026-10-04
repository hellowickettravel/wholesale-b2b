import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

/** Full-card state for the driver pages (done, expired, not valid). */
export function Message({ tone, title, children }: { tone: "success" | "warning"; title: string; children: React.ReactNode }) {
  const Icon = tone === "success" ? CheckCircle2 : title.includes("expired") ? Clock : AlertTriangle;
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-line bg-raised px-6 py-10 text-center">
      <span className={`grid size-14 place-items-center rounded-full ${tone === "success" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-xl font-bold">{title}</h1>
      <p className="mt-2 text-[15px] text-ink-muted">{children}</p>
    </div>
  );
}
