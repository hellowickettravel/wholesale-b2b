import { z } from "zod";
import { parsePercent, parsePounds } from "@/domain/money";
import { passwordSchema } from "./auth";

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;
const optional = (max: number, label: string) => z.string().trim().max(max, `${label} is too long`).optional().default("");

/** Customer details as the admin edits them (everything but the name is optional). */
export const customerDetailsSchema = z.object({
  business_name: z.string().trim().min(1, "Enter the restaurant's name").max(200),
  contact_name: optional(200, "Contact name"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address")
    .optional()
    .default(""),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[+\d][\d ()-]{6,19}$/.test(v), "Enter a valid phone number")
    .optional()
    .default(""),
  address_line1: optional(200, "Address"),
  address_line2: optional(200, "Address line 2"),
  city: optional(100, "Town or city"),
  postcode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || UK_POSTCODE.test(v), "Enter a valid UK postcode")
    .optional()
    .default(""),
  delivery_notes: optional(1000, "Delivery notes"),
});

/**
 * A restaurant the admin adds. `login` says how its owner gets in: an email invitation, a password the admin
 * sets now and passes on (works without email), or no login yet.
 */
export const newCustomerSchema = customerDetailsSchema
  .extend({
    login: z.enum(["invite", "password", "none"]).optional().default("invite"),
    password: z.string().max(200).optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.login === "none") return;
    const what = v.login === "invite" ? "send the login invitation to" : "sign in with";
    if (!v.email) ctx.addIssue({ code: "custom", path: ["email"], message: `Enter an email to ${what}` });
    if (!v.contact_name) ctx.addIssue({ code: "custom", path: ["contact_name"], message: "Enter the contact's name for the login" });
    if (v.login === "password") {
      const pw = passwordSchema.safeParse(v.password);
      if (!pw.success) ctx.addIssue({ code: "custom", path: ["password"], message: pw.error.issues[0]?.message ?? "Choose a stronger password" });
    }
  });

/** "" -> null (use the next rule down), "12.5" -> 1250 bp. Range -100% … +1000%. */
export const marginField = z.string().trim().transform((s, ctx) => {
  if (s === "") return null;
  const bp = parsePercent(s);
  if (bp === null || bp < -10000 || bp > 100000) {
    ctx.addIssue({ code: "custom", message: "Enter a margin like 15 or 12.5 (per cent)" });
    return z.NEVER;
  }
  return bp;
});

export const statusChangeSchema = z
  .object({
    action: z.enum(["approve", "reject", "suspend", "reactivate"]),
    reason: z.string().trim().max(1000, "Keep the reason under 1000 characters").optional().default(""),
    categories: z.array(z.uuid()).max(200).optional().default([]),
    default_margin: marginField.optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.action === "reject" || v.action === "suspend") && !v.reason) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Give a reason. The restaurant sees it on their account page." });
    }
  });

const pence = z.number().int().min(0).max(100_000_000);
const bp = z.number().int().min(-10000).max(100000);

/** Everything the pricing screen saves in one go. Only changed products and sizes are sent. */
export const pricingSaveSchema = z.object({
  defaultMarginBp: bp.nullable(),
  categories: z.array(z.object({ id: z.uuid(), access: z.boolean(), marginBp: bp.nullable() })).max(500),
  productRules: z.record(z.uuid(), z.enum(["allow", "deny"]).nullable()),
  overrides: z.record(z.uuid(), pence.nullable()),
});
export type PricingSave = z.infer<typeof pricingSaveSchema>;

const money = (label: string) =>
  z.string().trim().transform((s, ctx) => {
    const p = parsePounds(s || "0");
    if (p === null || p < 0 || p > 100_000_000) {
      ctx.addIssue({ code: "custom", message: `Enter ${label} in pounds, e.g. 150 or 12.50` });
      return z.NEVER;
    }
    return p;
  });
const required = (label: string, max: number) => z.string().trim().min(1, `Enter ${label}`).max(max, "Too long");

export const settingsSchema = z.object({
  global_margin: z.string().trim().transform((s, ctx) => {
    const bp = parsePercent(s);
    if (bp === null || bp < -10000 || bp > 100000) {
      ctx.addIssue({ code: "custom", message: "Enter a margin like 20 or 17.5 (per cent)" });
      return z.NEVER;
    }
    return bp;
  }),
  min_order: money("the minimum order"),
  delivery_charge: money("the delivery charge"),
  delivery_vat_mode: z.enum(["apportioned", "fixed"]),
  delivery_fixed_vat: z.string().trim().transform((s, ctx) => {
    const bp = parsePercent(s || "0");
    if (bp === null || bp < 0 || bp > 10000) {
      ctx.addIssue({ code: "custom", message: "Enter a VAT rate between 0 and 100" });
      return z.NEVER;
    }
    return bp;
  }),
  delivery_days: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Choose at least one delivery day").max(7),
  show_prices_inc_vat: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  business_legal_name: required("the legal business name", 200),
  business_address: required("the business address", 500),
  vat_number: required("the VAT number", 30),
  bank_name: required("the bank name", 100),
  bank_account_name: required("the account name", 140),
  bank_sort_code: required("the sort code", 20),
  bank_account_number: required("the account number", 20),
  bank_iban: z.string().trim().max(40).optional().default(""),
  invoice_footer: required("the invoice footer", 2000),
});
