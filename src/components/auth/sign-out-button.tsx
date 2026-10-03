import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";

/** Plain POST form so sign-out works without JavaScript and cannot be triggered by a link. */
export function SignOutButton({ className, label = "Sign out", iconOnly }: { className?: string; label?: string; iconOnly?: boolean }) {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" title={iconOnly ? label : undefined} className={cn("inline-flex items-center gap-2 text-sm font-medium", className)}>
        <LogOut className="size-4" aria-hidden="true" />
        <span className={iconOnly ? "sr-only" : undefined}>{label}</span>
      </button>
    </form>
  );
}
