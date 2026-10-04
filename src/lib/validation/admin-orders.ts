import { z } from "zod";
import { parsePounds } from "@/domain/money";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");
const optionalDate = z.union([z.literal(""), isoDate]);

export const PAYMENT_METHODS = ["bank_transfer", "cash", "cheque", "card", "other"] as const;
export const PAYMENT_METHOD_LABEL: Record<(typeof PAYMENT_METHODS)[number], string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

/** Pounds typed by the admin, positive, to pence. */
export const poundsAmount = z
  .string()
  .trim()
  .transform((s, ctx) => {
    const p = parsePounds(s);
    if (p === null || p <= 0) {
      ctx.addIssue({ code: "custom", message: "Enter an amount, like 125.50" });
      return z.NEVER;
    }
    if (p > 100_000_000) {
      ctx.addIssue({ code: "custom", message: "That amount is too large" });
      return z.NEVER;
    }
    return p;
  });

/** A payment from a restaurant (or a refund to it) or to a supplier. Date checked against today by the action. */
export const paymentSchema = z.object({
  amount: poundsAmount,
  paid_on: isoDate,
  method: z.enum(PAYMENT_METHODS, { error: "Choose how it was paid" }),
  reference: z.string().trim().max(200, "Keep the reference under 200 characters").optional().default(""),
  note: z.string().trim().max(2000, "Keep the note under 2,000 characters").optional().default(""),
  refund: z.literal("on").optional(),
});

export const chaseSchema = z.object({
  promised_pay_date: optionalDate,
  next_chase_date: optionalDate,
  payment_notes: z.string().trim().max(4000, "Keep the notes under 4,000 characters").optional().default(""),
});

export const cancelSchema = z.object({
  reason: z.string().trim().min(1, "Say why, so the restaurant and suppliers know").max(500, "Keep it under 500 characters"),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Enter the supplier's name").max(200),
  email: z.union([z.literal(""), z.email("Enter a valid email").max(320)]),
  phone: z.string().trim().max(50).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(4000).optional().default(""),
});

/** The order edit form posts `qty.<line id>`, `supplier.<line id>`, `cost.<line id>` for every live line. */
export interface LineEdit {
  id: string;
  qty: number;
  supplierId: string;
  unitCostPence: number | null;
}

export function readLineEdits(fd: FormData, lineIds: string[]): { edits: LineEdit[]; errors: Record<string, string> } {
  const edits: LineEdit[] = [];
  const errors: Record<string, string> = {};
  for (const id of lineIds) {
    const qtyRaw = String(fd.get(`qty.${id}`) ?? "").trim();
    const qty = /^\d{1,4}$/.test(qtyRaw) ? Number(qtyRaw) : NaN;
    if (!Number.isInteger(qty)) errors[`qty.${id}`] = "Whole number, 0–9999";
    const supplierId = String(fd.get(`supplier.${id}`) ?? "");
    if (!z.uuid().safeParse(supplierId).success) errors[`supplier.${id}`] = "Choose a supplier";
    const costRaw = String(fd.get(`cost.${id}`) ?? "").trim();
    let unitCostPence: number | null = null;
    if (costRaw !== "") {
      const c = parsePounds(costRaw);
      if (c === null || c < 0) errors[`cost.${id}`] = "Enter a cost, like 4.20";
      else unitCostPence = c;
    }
    edits.push({ id, qty, supplierId, unitCostPence });
  }
  return { edits, errors };
}
