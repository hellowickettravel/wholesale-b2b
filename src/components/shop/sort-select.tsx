"use client";

import { ArrowUpDown } from "lucide-react";

/** Sort dropdown inside a GET form: choosing an option submits the form (the URL is the state). */
export function SortSelect({ name = "sort", value, options, label = "Sort" }: { name?: string; value: string; options: { value: string; label: string }[]; label?: string }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <ArrowUpDown className="pointer-events-none absolute left-3 size-4 text-ink-muted" aria-hidden="true" />
      <select
        name={name}
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-10 cursor-pointer appearance-none rounded-full border border-line bg-raised pl-9 pr-9 text-sm font-semibold text-ink transition-colors hover:border-line-strong/60 focus:border-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute right-3 size-4 text-ink-muted">
        <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
