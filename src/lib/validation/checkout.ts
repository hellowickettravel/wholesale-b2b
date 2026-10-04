import { z } from "zod";
import { PAYMENT_TERMS } from "@/domain/dates";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

/** Checkout form. Dates are checked against delivery days and today on the server. */
export const checkoutSchema = z
  .object({
    checkout_key: z.uuid(),
    delivery_date: isoDate,
    payment_terms: z.enum(PAYMENT_TERMS, { error: "Choose when you will pay" }),
    pay_date: z.string().optional().default(""),
    note: z.string().trim().max(2000, "Keep the note under 2,000 characters").optional().default(""),
    expected_total: z.coerce.number().int().min(0),
  })
  .superRefine((v, ctx) => {
    if (v.payment_terms === "on_date" && !/^\d{4}-\d{2}-\d{2}$/.test(v.pay_date)) {
      ctx.addIssue({ code: "custom", path: ["pay_date"], message: "Choose the date you will pay" });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
