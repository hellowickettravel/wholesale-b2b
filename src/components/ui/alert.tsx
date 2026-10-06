import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";
// Soft fill + 1.5px inset ring in the tone; the tone colour is only used for the icon and title (all AA on the soft fill).
const styles: Record<Tone, string> = {
  info: "bg-info-soft text-info ring-info/25",
  success: "bg-success-soft text-success ring-success/25",
  warning: "bg-warning-soft text-warning ring-warning/30",
  danger: "bg-danger-soft text-danger ring-danger/25",
};
const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

export function Alert({ tone = "info", title, children, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  const Icon = icons[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-[var(--radius-md)] px-4 py-3 text-sm ring-[1.5px] ring-inset", styles[tone], className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-0.5">
        {title ? <p className="font-bold">{title}</p> : null}
        {children ? <div className="text-ink">{children}</div> : null}
      </div>
    </div>
  );
}
