import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { signIn, sql } from "./helpers";

const A = "20000000-0000-4000-a000-000000000001";
const SUP_A = "00000000-0000-4000-a000-000000000001";
const SUP_B = "00000000-0000-4000-a000-000000000002";

/** 2 × rice (supplier A, 0%) + 3 × mango (supplier B, 20%) + £12 delivery = £166.45, as the shop places it. */
async function placeOrder(): Promise<{ orderId: string; number: number; soA: string; soB: string }> {
  const [r] = await sql<{ r: { order_id: string; number: number } }>("select public.create_order_tx($1::jsonb) r", [
    JSON.stringify({
      customer_id: A, placed_by: "10000000-0000-4000-a000-000000000004", checkout_key: randomUUID(),
      delivery_date: new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10), payment_terms: "on_delivery",
      totals: { goods_net_pence: 14340, goods_vat_pence: 1020, delivery_net_pence: 1200, delivery_vat_pence: 85, vat_pence: 1105, total_pence: 16645 },
      supplier_orders: [
        { supplier_id: SUP_A, items: [{ variant_id: "50000000-0000-4000-a000-000000000002", product_name: "Basant Basmati Rice", size_label: "20 kg", qty: 2, unit_price_pence: 4620, unit_cost_pence: 4200, vat_rate_bp: 0, line_net_pence: 9240, line_vat_pence: 0 }] },
        { supplier_id: SUP_B, items: [{ variant_id: "50000000-0000-4000-a000-000000000003", product_name: "Mango Drink", size_label: "330 ml × 24", qty: 3, unit_price_pence: 1700, unit_cost_pence: 1450, vat_rate_bp: 2000, line_net_pence: 5100, line_vat_pence: 1020 }] },
      ],
    }),
  ]);
  const parts = await sql<{ id: string; supplier_id: string }>("select id, supplier_id from supplier_orders where order_id = $1", [r.r.order_id]);
  return { orderId: r.r.order_id, number: r.r.number, soA: parts.find((p) => p.supplier_id === SUP_A)!.id, soB: parts.find((p) => p.supplier_id === SUP_B)!.id };
}

async function deliver(supplierOrderId: string) {
  await sql("select public.record_delivery_proof($1::jsonb)", [JSON.stringify({ supplier_order_id: supplierOrderId, submitted_by_kind: "supplier", photo_path: "e2e/photo.jpg", signature_path: "e2e/sig.png" })]);
}

const customerPaymentForm = (page: Page) => page.locator("form:has(input[name='refund'])");
/** Unfold "Record a payment" if it is folded away. */
async function openPaymentForm(page: Page) {
  const details = page.locator("details:has(input[name='refund'])");
  if (!(await details.evaluate((d: HTMLDetailsElement) => d.open))) await details.locator("summary").click();
}

test.describe("admin orders and payments", () => {
  test("change an order: quantity up, a line moved to another supplier; everyone sees the new split", async ({ page, browser }) => {
    const o = await placeOrder();
    const ref = `ORDER-${o.number}`;
    await signIn(page, "admin@example.com");
    await page.goto("/admin/orders");
    await page.getByRole("link", { name: new RegExp(`^${ref}`) }).click();
    await expect(page.getByRole("heading", { level: 1, name: ref })).toBeVisible();
    await expect(page.getByText("Delivery 1 of 2: Dev Supplier A")).toBeVisible();
    await expect(page.getByText("Delivery 2 of 2: Dev Supplier B")).toBeVisible();
    // Profit (D6): 14340 + 1200 − (2 × 4200 + 3 × 1450) = £27.90.
    await expect(page.getByText("£27.90").first()).toBeVisible();

    await page.getByLabel(/Quantity of Basant Basmati Rice/).fill("3");
    await page.getByLabel(/Supplier for Mango Drink/).selectOption({ label: "Dev Supplier A" });
    await expect(page.getByText("Moving: enter this supplier's cost")).toBeVisible();
    await page.getByLabel(/Unit cost £ of Mango Drink/).fill("13.00");
    // 3 × £46.20 + 3 × £17.00 = £189.60, delivery £12 kept, VAT £10.20 + £0.65 on delivery.
    await expect(page.getByTestId("edit-new-total")).toHaveText("£212.45");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Order updated.")).toBeVisible();
    await expect(page.getByText("Delivery 1 of 1: Dev Supplier A")).toBeVisible();

    const [row] = await sql<{ total: number; inv: number; b: string }>(
      `select o.total_pence::int total, i.total_pence::int inv, (select status::text from supplier_orders where id = $2) b
         from orders o join invoices i on i.order_id = o.id where o.id = $1`, [o.orderId, o.soB]);
    expect(row).toEqual({ total: 21245, inv: 21245, b: "cancelled" });
    await expect(page.getByText(/Mango Drink 330 ml × 24 moved from Dev Supplier B to Dev Supplier A/)).toBeVisible();

    // The restaurant sees one delivery with both lines and the new total.
    const ctx = await browser.newContext();
    const r = await ctx.newPage();
    await signIn(r, "restaurant.a@example.com");
    await r.goto(`/orders/${o.orderId}`);
    await expect(r.getByRole("heading", { name: /^Delivery/ })).toHaveCount(1);
    await expect(r.getByText("£212.45").first()).toBeVisible();
    await ctx.close();

    // Supplier B is told its part is cancelled; supplier A sees the mango now.
    const notes = await sql<{ email: string; title: string }>(
      "select p.email, n.title from notifications n join profiles p on p.id = n.user_id where n.link in ($1, $2) order by n.created_at, p.email",
      [`/supplier/orders/${o.soA}`, `/supplier/orders/${o.soB}`],
    );
    expect(notes.map((n) => `${n.email}: ${n.title}`)).toEqual(expect.arrayContaining([`supplier.b@example.com: ${ref} cancelled`, `supplier.a@example.com: ${ref} changed`]));
    const ctxA = await browser.newContext();
    const s = await ctxA.newPage();
    await signIn(s, "supplier.a@example.com");
    await s.goto(`/supplier/orders/${o.soA}`);
    await expect(s.getByText("Mango Drink")).toBeVisible();
    await ctxA.close();
  });

  test("take a line off; payments, chasing and a reminder; paid in full clears the chase", async ({ page }) => {
    const o = await placeOrder();
    await signIn(page, "admin@example.com");
    await page.goto(`/admin/orders/${o.orderId}`);
    await page.getByLabel(/Quantity of Mango Drink/).fill("0");
    await page.getByLabel("Delivery charge (£, ex VAT)").fill("12.00");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Order updated.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Taken off the order" })).toBeVisible();
    // £92.40 + £12.00, all at 0%.
    const [{ total }] = await sql<{ total: number }>("select total_pence::int total from orders where id = $1", [o.orderId]);
    expect(total).toBe(10440);

    // Chase date today: on the chase list.
    const today = (await sql<{ d: string }>("select (now() at time zone 'Europe/London')::date::text d"))[0].d;
    await page.locator("input[name='next_chase_date']").fill(today);
    await page.locator("input[name='promised_pay_date']").fill(today);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.goto("/admin/payments");
    await expect(page.getByRole("link", { name: new RegExp(`ORDER-${o.number}`) })).toBeVisible();

    // A reminder is queued once and moves the chase on.
    const row = page.getByRole("row", { name: new RegExp(`ORDER-${o.number}`) });
    await row.getByRole("button", { name: "Send payment reminder" }).click();
    await expect(page.getByText("Reminder queued. Next chase moved on three days.")).toBeVisible();
    // Dealt with for today: it leaves the chase list.
    await expect(row).toHaveCount(0);
    const [mail] = await sql<{ n: number; next: string }>(
      "select (select count(*)::int from email_log where template = 'payment_reminder' and entity_id = $2) n, next_chase_date::text next from orders where id = $1", [o.orderId, o.orderId]);
    expect(mail.n).toBe(1);
    expect(mail.next > today).toBe(true);

    // Part payment, then the rest.
    await page.goto(`/admin/orders/${o.orderId}`);
    const form = customerPaymentForm(page);
    await form.locator("input[name='amount']").fill("50.00");
    await form.locator("input[name='reference']").fill(`ORDER-${o.number}`);
    await form.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("Payment recorded.")).toBeVisible();
    await expect(page.getByText("Part paid").first()).toBeVisible();
    await openPaymentForm(page);
    await customerPaymentForm(page).locator("input[name='amount']").fill("54.40");
    await customerPaymentForm(page).getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText(/Payment received £54\.40/)).toBeVisible();
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
    const [after] = await sql<{ chase: string | null; paid: number }>(
      "select next_chase_date::text chase, (select sum(amount_pence)::int from customer_payments where order_id = $1) paid from orders where id = $1", [o.orderId]);
    expect(after).toEqual({ chase: null, paid: 10440 });
    await expect(page.getByText(/Payment received £54\.40/)).toBeVisible();

    // A payment dated in the future is refused.
    await openPaymentForm(page);
    await customerPaymentForm(page).locator("input[name='amount']").fill("1");
    await customerPaymentForm(page).locator("input[name='paid_on']").fill("2099-01-01");
    await customerPaymentForm(page).getByRole("button", { name: "Record payment" }).click();
    // The browser stops it (max = today); the server refuses it too (checkDate).
    expect(await customerPaymentForm(page).locator("input[name='paid_on']").evaluate((i: HTMLInputElement) => i.validity.rangeOverflow)).toBe(true);
    const [{ n }] = await sql<{ n: number }>("select count(*)::int n from customer_payments where order_id = $1", [o.orderId]);
    expect(n).toBe(2);
  });

  test("pay a supplier for delivered orders from its page; a delivered order is locked and can be completed", async ({ page }) => {
    const o = await placeOrder();
    await deliver(o.soA);
    await deliver(o.soB);
    await signIn(page, "admin@example.com");
    await page.goto(`/admin/orders/${o.orderId}`);
    await expect(page.getByText("A delivery has been made, so the order can no longer be changed.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(0);

    // Earlier runs leave other unpaid parts for supplier B; settle them so only this one is listed.
    await sql("update supplier_orders set paid_to_supplier = true where supplier_id = $1 and id <> $2", [SUP_B, o.soB]);
    await page.goto(`/admin/suppliers/${SUP_B}`);
    const box = page.getByRole("checkbox", { name: new RegExp(`ORDER-${o.number}`) });
    await expect(box).toBeChecked();
    // Supplier B is owed 3 × £14.50 + 20% VAT = £52.20 for this order.
    await expect(page.getByRole("listitem").filter({ has: box }).getByText("£52.20")).toBeVisible();
    // Untick everything else so only this order is paid.
    for (const other of await page.getByRole("checkbox", { checked: true }).all()) {
      if ((await other.getAttribute("value")) !== o.soB) await other.uncheck();
    }
    await page.locator("input[name='reference']").fill("BACS 123");
    await page.getByRole("button", { name: "Record payment and mark paid" }).click();
    await expect(page.getByText("Recorded £52.20 for 1 order.")).toBeVisible();
    const [b] = await sql<{ paid: boolean; amount: number }>(
      "select paid_to_supplier paid, (select sum(amount_pence)::int from supplier_payments where supplier_order_id = $1) amount from supplier_orders where id = $1", [o.soB]);
    expect(b).toEqual({ paid: true, amount: 5220 });

    // Supplier A ticked by hand on the order page; then complete with a warning (restaurant unpaid).
    await page.goto(`/admin/orders/${o.orderId}`);
    await page.getByTestId("part-Dev Supplier A").getByRole("button", { name: "Mark paid" }).click();
    await expect(page.getByText("Marked paid.")).toBeVisible();
    await expect(page.getByTestId("part-Dev Supplier A").getByRole("button", { name: "Mark not paid" })).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Mark completed" }).click();
    await expect(page.getByText("Order marked completed.")).toBeVisible();
    const [done] = await sql<{ status: string }>("select status::text from orders where id = $1", [o.orderId]);
    expect(done.status).toBe("completed");
  });

  test("cancel an order: the restaurant sees why, suppliers are told, the invoice is voided", async ({ page, browser }) => {
    const o = await placeOrder();
    await signIn(page, "admin@example.com");
    await page.goto(`/admin/orders/${o.orderId}`);
    await page.getByRole("button", { name: "Cancel order" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Cancel order" }).click();
    // The reason is required (the browser stops the empty form; the server checks again).
    expect(await dialog.getByLabel(/Reason/).evaluate((t: HTMLTextAreaElement) => t.validity.valueMissing)).toBe(true);
    await dialog.getByLabel(/Reason/).fill("Restaurant closed for a refit");
    await dialog.getByRole("button", { name: "Cancel order" }).click();
    await expect(page.getByText("Order cancelled. Suppliers and the restaurant have been told.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Restaurant closed for a refit").first()).toBeVisible();

    const [c] = await sql<{ voided: boolean; parts: string }>(
      "select i.voided_at is not null voided, (select string_agg(distinct status::text, ',') from supplier_orders where order_id = $1) parts from invoices i where i.order_id = $1", [o.orderId]);
    expect(c).toEqual({ voided: true, parts: "cancelled" });

    const ctx = await browser.newContext();
    const r = await ctx.newPage();
    await signIn(r, "restaurant.a@example.com");
    await r.goto(`/orders/${o.orderId}`);
    await expect(r.getByText("This order was cancelled")).toBeVisible();
    await expect(r.getByText("Restaurant closed for a refit")).toBeVisible();
    await expect(r.getByText("Bank details")).toHaveCount(0);
    await ctx.close();
  });

  test("suppliers: add, switch off and on, dashboard and audit log", async ({ page }) => {
    await signIn(page, "admin@example.com");
    await page.goto("/admin/suppliers/new");
    const name = `E2E Supplier ${Date.now()}`;
    await page.locator("input[name='name']").fill(name);
    await page.locator("input[name='email']").fill("orders@e2e-supplier.example.com");
    await page.getByRole("button", { name: "Add supplier" }).click();
    await expect(page.getByRole("heading", { level: 1, name: new RegExp(name) })).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Switch off" }).first().click();
    await expect(page.getByText(/Supplier switched off\./)).toBeVisible();
    const [s] = await sql<{ active: boolean }>("select active from suppliers where name = $1", [name]);
    expect(s.active).toBe(false);
    await page.getByRole("button", { name: "Switch on" }).click();
    await expect(page.getByText("Supplier switched on.")).toBeVisible();

    await page.goto("/admin/audit?entity=suppliers");
    await expect(page.getByText("Changed suppliers: active").first()).toBeVisible();

    await page.goto("/admin");
    for (const label of ["Owed to you", "Owed to suppliers", "Chase today", "Waiting for approval"]) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    await sql("update suppliers set name = name || ' (old)' where name = $1", [name]);
  });

  test("restaurants and suppliers cannot open the admin order, payment, supplier or audit screens", async ({ browser }) => {
    const o = await placeOrder();
    for (const email of ["restaurant.a@example.com", "supplier.a@example.com"]) {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await signIn(p, email);
      for (const path of ["/admin/orders", `/admin/orders/${o.orderId}`, "/admin/payments", "/admin/suppliers", `/admin/suppliers/${SUP_A}`, "/admin/audit"]) {
        expect((await p.goto(path))?.status(), `${email} ${path}`).toBe(403);
        await expect(p.getByText("£").first()).toHaveCount(0);
      }
      await ctx.close();
    }
  });
});
