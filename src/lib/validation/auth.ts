import { z } from "zod";

/** Shared server-side validation for auth forms. The server never trusts the browser. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(320, "That email address is too long")
  .pipe(z.email("Enter a valid email address"));

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Include at least one letter and one number");

const text = (label: string, max: number) =>
  z.string().trim().min(1, `Enter ${label}`).max(max, `${label[0].toUpperCase()}${label.slice(1)} is too long`);

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
  next: z.string().max(500).optional(),
});

export const registerSchema = z
  .object({
    business_name: text("your restaurant's name", 200),
    contact_name: text("your name", 200),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d][\d ()-]{6,19}$/, "Enter a valid phone number"),
    email: emailSchema,
    address_line1: text("the first line of the address", 200),
    address_line2: z.string().trim().max(200, "Address line 2 is too long").optional().default(""),
    city: text("the town or city", 100),
    postcode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(UK_POSTCODE, "Enter a valid UK postcode"),
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

export const forgotSchema = z.object({ email: emailSchema });

export const setPasswordSchema = z
  .object({ password: passwordSchema, confirm_password: z.string() })
  .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

export const inviteSchema = z
  .object({
    email: emailSchema,
    full_name: text("their name", 200),
    role: z.enum(["customer", "supplier", "admin"]),
    business_name: z.string().trim().max(200).optional().default(""),
    supplier_id: z.string().trim().optional().default(""),
    new_supplier_name: z.string().trim().max(200).optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.role === "customer" && !v.business_name) {
      ctx.addIssue({ code: "custom", path: ["business_name"], message: "Enter the restaurant's name" });
    }
    if (v.role === "supplier" && !v.supplier_id && !v.new_supplier_name) {
      ctx.addIssue({ code: "custom", path: ["supplier_id"], message: "Choose a supplier or enter a new supplier name" });
    }
    if (v.role === "supplier" && v.supplier_id && !z.uuid().safeParse(v.supplier_id).success) {
      ctx.addIssue({ code: "custom", path: ["supplier_id"], message: "Choose a supplier from the list" });
    }
  });

/** Result shape for useActionState forms. */
export interface FormState {
  error?: string;
  notice?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
}

export function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

/** Echo submitted values back to the form (never passwords). */
export function echo(formData: FormData, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = formData.get(k);
    if (typeof v === "string") out[k] = v.slice(0, 500);
  }
  return out;
}
