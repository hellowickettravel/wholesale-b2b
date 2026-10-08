"use client";

import { useState } from "react";
import { KeyRound, Mail, UserX, Wand2 } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export type LoginMode = "invite" | "password" | "none";

const OPTIONS: { value: LoginMode; title: string; text: string; icon: typeof Mail }[] = [
  { value: "invite", title: "Email an invitation", text: "They get a link to set their own password.", icon: Mail },
  { value: "password", title: "Set a password now", text: "Works straight away. Send it to them yourself, e.g. on WhatsApp.", icon: KeyRound },
  { value: "none", title: "No login yet", text: "Add the business only; invite them later.", icon: UserX },
];

/** A readable random password: 3 lowercase words-ish chunks and digits, e.g. "mango-tila-4821". */
function suggestPassword(): string {
  const syll = ["ba", "ka", "ma", "ra", "ta", "si", "lo", "ne", "pu", "di", "go", "ve", "zu", "ri", "sa", "mo"];
  const buf = new Uint32Array(8);
  crypto.getRandomValues(buf);
  const word = (i: number) => syll[buf[i] % syll.length] + syll[buf[i + 1] % syll.length] + syll[buf[i + 2] % syll.length];
  return `${word(0)}-${word(3)}-${1000 + (buf[6] % 9000)}`;
}

/**
 * How a new login is made: invitation email, a password the admin sets now, or (optionally) none.
 * Posts `login` and, for "password", `password`.
 */
export function LoginChoice({ allowNone = false, defaultMode = "invite", passwordError }: { allowNone?: boolean; defaultMode?: LoginMode; passwordError?: string | string[] }) {
  const [mode, setMode] = useState<LoginMode>(defaultMode);
  const [password, setPassword] = useState("");
  const options = allowNone ? OPTIONS : OPTIONS.filter((o) => o.value !== "none");
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-semibold text-ink">How will they sign in?</legend>
      <div className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
        {options.map(({ value, title, text, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              "flex cursor-pointer gap-3 rounded-[var(--radius-md)] border p-3 transition-colors duration-[var(--dur-fast)]",
              mode === value ? "border-primary bg-primary-soft/60 shadow-[inset_0_0_0_1px_var(--brand-primary)]" : "border-line bg-raised hover:border-line-strong/60",
            )}
          >
            <input type="radio" name="login" value={value} checked={mode === value} onChange={() => setMode(value)} className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--brand-primary)]" />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Icon className={cn("size-4 shrink-0", mode === value ? "text-primary" : "text-ink-muted")} aria-hidden="true" />
                {title}
              </span>
              <span className="block text-xs leading-snug text-ink-muted">{text}</span>
            </span>
          </label>
        ))}
      </div>
      {mode === "password" ? (
        <Field label="Password for them" required error={passwordError} hint="8+ characters with a letter and a number. You will see it once here; copy it before saving.">
          {(p) => (
            <div className="flex gap-2">
              <Input {...p} name="password" type="text" autoComplete="new-password" spellCheck={false} value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
              <button
                type="button"
                onClick={() => setPassword(suggestPassword())}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border border-line-strong/70 bg-raised px-3 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <Wand2 className="size-4" aria-hidden="true" /> Suggest
              </button>
            </div>
          )}
        </Field>
      ) : null}
    </fieldset>
  );
}
