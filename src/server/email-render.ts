/**
 * Email bodies. Pure functions from plain data to { text, html }: no I/O, unit-tested (tests/unit/email-render.test.ts).
 * One shared frame (brand colours inline, a single button), one body per kind of message. Supplier emails carry
 * quantities and delivery details only: never prices or costs.
 */
import { brand } from "@/config/brand";
import { formatPence } from "@/domain/money";

export interface Rendered {
  text: string;
  html: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The email frame: header, content paragraphs, optional button, footer. */
function frame(opts: { heading: string; paragraphs: string[]; table?: { label: string; value: string }[]; button?: { label: string; url: string }; note?: string }): Rendered {
  const { heading, paragraphs, table, button, note } = opts;
  const c = brand.colors;
  const rows = (table ?? [])
    .map((r) => `<tr><td style="padding:6px 12px 6px 0;color:${c.muted};font-size:14px;vertical-align:top">${esc(r.label)}</td><td style="padding:6px 0;color:${c.ink};font-size:14px;font-weight:600">${esc(r.value)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:${c.surface};font-family:Inter,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.surface};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid ${c.line};border-radius:12px;overflow:hidden">
<tr><td style="background:${c.primary};padding:18px 24px;color:#fff;font-size:18px;font-weight:700">${esc(brand.wordmark.lead)} <span style="color:#FFC532">${esc(brand.wordmark.tail)}</span></td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:${c.ink}">${esc(heading)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${c.ink}">${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n")}
${rows ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 14px">${rows}</table>` : ""}
${button ? `<p style="margin:18px 0"><a href="${esc(button.url)}" style="display:inline-block;background:${c.accent};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:8px">${esc(button.label)}</a></p>` : ""}
${note ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:${c.muted}">${esc(note)}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${c.line};font-size:12px;line-height:1.5;color:${c.muted}">${esc(brand.tradingAs)}<br>${esc(brand.contact.email)} · WhatsApp ${esc(brand.contact.phoneDisplay)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [heading, "", ...paragraphs, ...(table?.length ? ["", ...table.map((r) => `${r.label}: ${r.value}`)] : []), ...(button ? ["", `${button.label}: ${button.url}`] : []), ...(note ? ["", note] : []), "", "--", brand.tradingAs, `${brand.contact.email} · WhatsApp ${brand.contact.phoneDisplay}`].join("\n");
  return { text, html };
}

const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

export interface OrderEmailData {
  number: number;
  businessName: string;
  deliveryDate: string;
  deliveryAddress: string;
  goodsNetPence: number;
  deliveryNetPence: number;
  vatPence: number;
  totalPence: number;
  paidPence: number;
  paymentTerms: "on_delivery" | "within_7_days" | "on_date";
  lines: { name: string; size: string; qty: number; linePence: number }[];
  url: string;
  invoicesUrl: string;
  bank?: { name: string; sortCode: string; accountNumber: string } | null;
}

const TERMS = { on_delivery: "Pay on delivery", within_7_days: "Pay within 7 days", on_date: "Pay by the agreed date" } as const;
const ref = (n: number) => `ORDER-${n}`;
const lineText = (l: OrderEmailData["lines"][number]) => `${l.qty} × ${l.name} (${l.size}): ${formatPence(l.linePence)}`;

export function renderOrderConfirmation(o: OrderEmailData): Rendered {
  return frame({
    heading: `Thanks, ${ref(o.number)} is confirmed`,
    paragraphs: [`Hello ${o.businessName}, we have your order and have passed it to our suppliers.`, ...o.lines.map(lineText)],
    table: [
      { label: "Goods (ex VAT)", value: formatPence(o.goodsNetPence) },
      { label: "Delivery", value: o.deliveryNetPence > 0 ? formatPence(o.deliveryNetPence) : "Free" },
      { label: "VAT", value: formatPence(o.vatPence) },
      { label: "Total", value: formatPence(o.totalPence) },
      { label: "Delivering", value: `${day(o.deliveryDate)}, to ${o.deliveryAddress}` },
      { label: "Payment", value: TERMS[o.paymentTerms] },
    ],
    button: { label: "View your order", url: o.url },
    note: "Your invoice is on the Invoices page of your account. Part of an order can arrive separately when it comes from different suppliers.",
  });
}

export function renderOrderDelivered(o: OrderEmailData, partial: boolean): Rendered {
  return frame({
    heading: partial ? `Part of ${ref(o.number)} was delivered` : `${ref(o.number)} was delivered`,
    paragraphs: [
      `Hello ${o.businessName}, ${partial ? "one of the deliveries for your order has arrived. The rest is on its way." : "your order has been delivered."} The photo and signature are on your order page.`,
      "If anything is missing or damaged, please tell us today by WhatsApp or email with a photo.",
    ],
    button: { label: "View delivery details", url: o.url },
  });
}

export function renderOrderChanged(o: OrderEmailData, kind: "changed" | "cancelled", subject: string): Rendered {
  return frame({
    heading: subject,
    paragraphs: [
      kind === "cancelled" ? `Hello ${o.businessName}, ${ref(o.number)} has been cancelled.` : `Hello ${o.businessName}, we have updated ${ref(o.number)} after speaking with you.`,
      "Open the order to see exactly what it now contains.",
    ],
    button: { label: "View your order", url: o.url },
  });
}

export function renderPaymentReminder(o: OrderEmailData): Rendered {
  const due = Math.max(0, o.totalPence - o.paidPence);
  return frame({
    heading: `Payment reminder: ${ref(o.number)}`,
    paragraphs: [
      `Hello ${o.businessName}, a friendly reminder that ${formatPence(due)} is still due on ${ref(o.number)}.`,
      o.bank ? "You can pay by bank transfer using the details below. Please use the reference so we can match it." : `To pay, message us on WhatsApp ${brand.contact.phoneDisplay} or email ${brand.contact.email} and we will send the payment details.`,
    ],
    table: [
      { label: "Amount due", value: formatPence(due) },
      { label: "Reference", value: ref(o.number) },
      ...(o.bank ? [{ label: "Account", value: o.bank.name }, { label: "Sort code", value: o.bank.sortCode }, { label: "Account number", value: o.bank.accountNumber }] : []),
    ],
    button: { label: "View invoices", url: o.invoicesUrl },
    note: "If you have already paid, thank you, and please ignore this message.",
  });
}

export interface SupplierEmailData {
  number: number;
  supplierName: string;
  customerName: string;
  customerPhone: string | null;
  deliveryDate: string;
  deliveryAddress: string;
  deliveryNotes: string | null;
  note: string | null;
  /** Quantities only. Never prices or costs. */
  lines: { name: string; size: string; qty: number }[];
  url: string;
}

export function renderSupplierOrder(s: SupplierEmailData, kind: "new" | "changed" | "cancelled", subject: string): Rendered {
  return frame({
    heading: subject,
    paragraphs: [
      kind === "cancelled" ? `Hello ${s.supplierName}, ${ref(s.number)} has been cancelled. Please do not deliver it.` : kind === "changed" ? `Hello ${s.supplierName}, ${ref(s.number)} has changed. Please use the updated list below.` : `Hello ${s.supplierName}, you have a new order to deliver.`,
      ...(kind === "cancelled" ? [] : s.lines.map((l) => `${l.qty} × ${l.name} (${l.size})`)),
    ],
    table: kind === "cancelled"
      ? [{ label: "Order", value: ref(s.number) }]
      : [
          { label: "Order", value: ref(s.number) },
          { label: "Deliver on", value: day(s.deliveryDate) },
          { label: "Customer", value: s.customerName },
          ...(s.customerPhone ? [{ label: "Phone", value: s.customerPhone }] : []),
          { label: "Address", value: s.deliveryAddress },
          ...(s.deliveryNotes ? [{ label: "Delivery notes", value: s.deliveryNotes }] : []),
          ...(s.note ? [{ label: "Order note", value: s.note }] : []),
        ],
    button: { label: "Open the order", url: s.url },
  });
}

export function renderAccountApproved(businessName: string, loginUrl: string): Rendered {
  return frame({
    heading: "Your trade account is approved",
    paragraphs: [`Good news, ${businessName}. Your account is approved and your prices are ready.`, "Sign in to browse the catalogue at your own prices and place your first order."],
    button: { label: "Sign in and order", url: loginUrl },
  });
}

export function renderAccountRejected(businessName: string): Rendered {
  return frame({
    heading: "About your trade account application",
    paragraphs: [
      `Hello ${businessName}, thank you for applying. We are not able to open a trade account for you at the moment.`,
      `If you think this is a mistake, or your details have changed, please contact us on WhatsApp ${brand.contact.phoneDisplay} or at ${brand.contact.email}.`,
    ],
  });
}

export function renderAdminNewRegistration(d: { businessName: string; contactName: string; email: string; phone: string; url: string }): Rendered {
  return frame({
    heading: "New trade account to review",
    paragraphs: ["Someone has applied for a trade account. They cannot see prices until you approve them."],
    table: [
      { label: "Business", value: d.businessName },
      { label: "Contact", value: d.contactName },
      { label: "Email", value: d.email },
      { label: "Phone", value: d.phone },
    ],
    button: { label: "Review the application", url: d.url },
  });
}

export function renderTest(): Rendered {
  return frame({ heading: "Test email", paragraphs: [`This is a test from the ${brand.name} admin. If you can read this, orders and approvals can reach you by email.`] });
}

export function renderGeneric(subject: string, url?: string): Rendered {
  return frame({ heading: subject, paragraphs: ["There is an update on your account."], button: url ? { label: "Open", url } : undefined });
}
