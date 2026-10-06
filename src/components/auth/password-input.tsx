"use client";
import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/field";

/** Password field with a show/hide toggle (helps on phones). The toggle is a 44px target with a word, not just an icon. */
export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-[4.5rem]" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex min-w-[4.25rem] cursor-pointer items-center justify-center gap-1.5 rounded-r-[var(--radius-md)] px-2 text-[13px] font-bold text-ink-muted transition-colors duration-[var(--dur-fast)] hover:text-ink"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        <span aria-hidden="true">{visible ? "Hide" : "Show"}</span>
      </button>
    </div>
  );
}
