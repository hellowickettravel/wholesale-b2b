import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { signIn, sql } from "./helpers";

/** Text of a PDF response (poppler's pdftotext is installed in the dev container). */
async function pdfText(request: APIRequestContext, url: string): Promise<{ status: number; text: string; type: string }> {
  const res = await request.get(url);
  if (res.status() !== 200) return { status: res.status(), text: "", type: res.headers()["content-type"] ?? "" };
  const file = path.join(mkdtempSync(path.join(tmpdir(), "inv-")), "x.pdf");
  writeFileSync(file, await res.body());
  return { status: 200, text: execFileSync("pdftotext", ["-layout", file, "-"]).toString(), type: res.headers()["content-type"] ?? "" };
}

async function invoiceOf(orderNumber: number) {
  const [r] = await sql<{ id: string; number: number }>("select i.id, i.number::int number from invoices i join orders o on o.id = i.order_id where o.number = $1", [orderNumber]);
  return r;
}

test.describe("invoices", () => {
  test("a restaurant lists and downloads its own invoice: VAT per rate, delivery, balance, no costs", async ({ page }) => {
    const inv = await invoiceOf(1001);
    await signIn(page, "restaurant.a@example.com");
    // The list starts with restaurant A's newest invoice (later runs add more orders).
    const [latest] = await sql<{ id: string; number: number; ord: number }>(
      "select i.id, i.number::int number, o.number::int ord from invoices i join orders o on o.id = i.order_id where i.customer_id = '20000000-0000-4000-a000-000000000001' order by i.number desc limit 1",
    );
    const ref = `INV-${String(latest.number).padStart(6, "0")}`;
    await page.goto("/invoices");
    const row = page.getByRole("listitem").filter({ hasText: ref });
    await expect(row).toBeVisible();
    await expect(row.getByRole("link", { name: `ORDER-${latest.ord}` })).toBeVisible();
    await expect(row.getByRole("link", { name: new RegExp(`PDF of ${ref}`) })).toHaveAttribute("href", `/api/invoices/${latest.id}/pdf`);

    const pdf = await pdfText(page.request, `/api/invoices/${inv.id}/pdf`);
    expect(pdf.status).toBe(200);
    expect(pdf.type).toBe("application/pdf");
    for (const s of ["INVOICE", "INV-000001", "ORDER-1001", "Dev Restaurant A", "Basant Basmati Rice", "VAT 0% on £92.40", "VAT 20% on £51.00", "VAT on delivery", "£0.85", "Total due", "£166.45", "Balance due", "PAYMENT", "Reference: ORDER-1001", "Home High Street Limited", "Company no. 17102079"]) {
      expect(pdf.text, s).toContain(s);
    }
    // Unit costs (rice £42.00, mango £14.50) never appear.
    expect(pdf.text).not.toMatch(/£42\.00|£14\.50/);

    // The order page links to the same PDF.
    const [o] = await sql<{ id: string }>("select id from orders where number = 1001");
    await page.goto(`/orders/${o.id}`);
    await expect(page.getByRole("link", { name: "Download invoice (PDF)" })).toHaveAttribute("href", `/api/invoices/${inv.id}/pdf`);
  });

  test("another restaurant, a supplier and a visitor cannot get it", async ({ page, browser, request }) => {
    const inv = await invoiceOf(1001);
    expect((await request.get(`/api/invoices/${inv.id}/pdf`)).status()).toBe(401);
    for (const email of ["restaurant.b@example.com", "supplier.a@example.com", "pending@example.com"]) {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await signIn(p, email);
      expect((await p.request.get(`/api/invoices/${inv.id}/pdf`)).status(), email).toBe(404);
      expect((await p.request.get("/api/invoices/not-a-uuid/pdf")).status(), email).toBe(404);
      await ctx.close();
    }
    // Restaurant B still gets its own.
    const own = await invoiceOf(1002);
    await signIn(page, "restaurant.b@example.com");
    expect((await page.request.get(`/api/invoices/${own.id}/pdf`)).status()).toBe(200);
  });

  test("admin finds any invoice; a cancelled order's invoice says VOID; a change shows on the invoice", async ({ page }) => {
    await signIn(page, "admin@example.com");
    await page.goto("/admin/invoices?q=INV-000002");
    await expect(page.getByRole("row").filter({ hasText: "INV-000002" })).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: "INV-000001" })).toHaveCount(0);

    // A fresh order for restaurant A, then cancelled.
    const [r] = await sql<{ r: { order_id: string; number: number; invoice_id: string } }>("select public.create_order_tx($1::jsonb) r", [JSON.stringify({
      customer_id: "20000000-0000-4000-a000-000000000001", placed_by: "10000000-0000-4000-a000-000000000004",
      delivery_date: new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10), payment_terms: "on_delivery",
      totals: { goods_net_pence: 9240, goods_vat_pence: 0, delivery_net_pence: 1200, delivery_vat_pence: 0, vat_pence: 0, total_pence: 10440 },
      supplier_orders: [{ supplier_id: "00000000-0000-4000-a000-000000000001", items: [{ variant_id: "50000000-0000-4000-a000-000000000002", product_name: "Basant Basmati Rice", size_label: "20 kg", qty: 2, unit_price_pence: 4620, unit_cost_pence: 4200, vat_rate_bp: 0, line_net_pence: 9240, line_vat_pence: 0 }] }],
    })]);
    const url = `/api/invoices/${r.r.invoice_id}/pdf`;
    let pdf = await pdfText(page.request, url);
    expect(pdf.text).toContain("£104.40");
    expect(pdf.text).not.toContain("VOID");

    // Admin doubles the rice: the invoice follows (before any delivery).
    await page.goto(`/admin/orders/${r.r.order_id}`);
    await page.getByLabel(/Quantity of Basant Basmati Rice/).fill("4");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Order updated.")).toBeVisible();
    pdf = await pdfText(page.request, url);
    expect(pdf.text).toContain("£196.80");

    await sql("select public.admin_cancel_order($1, null, 'Duplicate order')", [r.r.order_id]);
    pdf = await pdfText(page.request, url);
    expect(pdf.text).toMatch(/VOID\s+INVOICE/);
    expect(pdf.text).toContain("Nothing is payable on it");
    expect(pdf.text).not.toContain("PAY BY BANK TRANSFER");
    await page.goto(`/admin/invoices`);
    await expect(page.getByRole("row").filter({ hasText: `ORDER-${r.r.number}` }).getByText("Void")).toBeVisible();
  });
});
