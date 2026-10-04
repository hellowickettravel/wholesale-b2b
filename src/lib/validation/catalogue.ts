import { z } from "zod";
import { parsePercent, parsePounds } from "@/domain/money";

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(80, "Keep the web address under 80 characters.")
  .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and single hyphens.");

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** VAT as a percentage string ("0", "5", "20", "17.5") -> basis points. */
export const vatField = z.string().transform((s, ctx) => {
  const bp = parsePercent(s || "0");
  if (bp === null || bp < 0 || bp > 10000) {
    ctx.addIssue({ code: "custom", message: "Enter a VAT rate between 0 and 100." });
    return z.NEVER;
  }
  return bp;
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120),
  slug: slug.optional().default(""),
  description: z.string().trim().max(1000).optional().default(""),
  sort: z.coerce.number().int("Whole number").min(0).max(9999).default(0),
  default_vat: vatField,
  active: checkbox,
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(200),
  slug: slug.optional().default(""),
  category_id: z.uuid("Choose a category."),
  description: z.string().trim().max(4000).optional().default(""),
  active: checkbox,
});

export const variantSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  size_label: z.string().trim().min(1, "Enter a size, e.g. 5 kg.").max(60),
  supplier_id: z.union([z.uuid(), z.literal("")]),
  cost: z.string().trim().transform((s, ctx) => {
    if (s === "") return null;
    const p = parsePounds(s);
    if (p === null || p < 0 || p > 10_000_000) {
      ctx.addIssue({ code: "custom", message: "Enter a cost like 12.50, or leave blank." });
      return z.NEVER;
    }
    return p;
  }),
  vat: vatField,
  sku: z.string().trim().max(60, "Max 60 characters."),
  active: checkbox,
});

export type VariantInput = z.infer<typeof variantSchema>;

/** Read variant rows posted as v.<index>.<field>. */
export function variantRowsFrom(formData: FormData): Record<string, string>[] {
  const rows = new Map<number, Record<string, string>>();
  for (const [key, value] of formData.entries()) {
    const m = /^v\.(\d{1,3})\.([a-z_]+)$/.exec(key);
    if (!m || typeof value !== "string") continue;
    const i = Number(m[1]);
    const row = rows.get(i) ?? {};
    row[m[2]] = value;
    rows.set(i, row);
  }
  return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r);
}
