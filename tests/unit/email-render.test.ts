import { describe, expect, it } from "vitest";
import { renderAccountApproved, renderAdminNewRegistration, renderOrderConfirmation, renderPaymentReminder, renderSupplierOrder, type OrderEmailData } from "@/server/email-render";

const order: OrderEmailData = {
  number: 1042,
  businessName: "Raju's <Kitchen>",
  deliveryDate: "2026-10-15",
  deliveryAddress: "1 High St, London",
  goodsNetPence: 9100,
  deliveryNetPence: 0,
  vatPence: 780,
  totalPence: 9880,
  paidPence: 0,
  paymentTerms: "on_delivery",
  lines: [{ name: "Basmati Rice", size: "20 kg", qty: 2, linePence: 5200 }],
  url: "https://www.example.com/orders/abc",
  invoicesUrl: "https://www.example.com/invoices",
  bank: null,
};

describe("emails", () => {
  it("order confirmation carries the totals, the link and escapes the business name", () => {
    const m = renderOrderConfirmation(order);
    expect(m.text).toContain("ORDER-1042");
    expect(m.text).toContain("£98.80");
    expect(m.text).toContain("Free");
    expect(m.text).toContain("https://www.example.com/orders/abc");
    expect(m.html).toContain("Raju&#39;s".replace("&#39;", "'")); // apostrophe kept
    expect(m.html).toContain("&lt;Kitchen&gt;");
    expect(m.html).not.toContain("<Kitchen>");
  });

  it("a supplier email has quantities and delivery details but never a price", () => {
    const m = renderSupplierOrder(
      { number: 1042, supplierName: "Shrivi", customerName: "Raju", customerPhone: "07700 900000", deliveryDate: "2026-10-15", deliveryAddress: "1 High St", deliveryNotes: "Back door", note: null, lines: [{ name: "Basmati Rice", size: "20 kg", qty: 2 }], url: "https://x/s/1" },
      "new",
      "New order ORDER-1042",
    );
    expect(m.text).toContain("2 × Basmati Rice (20 kg)");
    expect(m.text).toContain("Back door");
    expect(m.text).not.toMatch(/£|\bprice\b|\bcost\b/i);
  });

  it("a payment reminder shows bank details only when there are real ones", () => {
    const without = renderPaymentReminder(order);
    expect(without.text).toContain("£98.80");
    expect(without.text).toContain("WhatsApp");
    expect(without.text).not.toContain("Sort code");
    const withBank = renderPaymentReminder({ ...order, paidPence: 1000, bank: { name: "Home High Street Ltd", sortCode: "00-00-00", accountNumber: "12345678" } });
    expect(withBank.text).toContain("£88.80");
    expect(withBank.text).toContain("Sort code: 00-00-00");
  });

  it("approval and registration notices link where they should", () => {
    expect(renderAccountApproved("Raju", "https://x/login").text).toContain("https://x/login");
    expect(renderAdminNewRegistration({ businessName: "A", contactName: "B", email: "c@d.e", phone: "1", url: "https://x/admin/approvals" }).text).toContain("/admin/approvals");
  });
});
