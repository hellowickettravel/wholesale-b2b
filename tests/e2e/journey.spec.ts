import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { emailLink, PASSWORD, signIn, sql } from "./helpers";

/**
 * The whole journey from the brief (§7), in one go, through the real screens:
 * register → confirm email → admin approves → restaurant orders across two suppliers → the order
 * splits → supplier A sends a driver link, the driver submits from a phone → supplier B uploads its
 * own proof → admin records the restaurant's payment and pays both suppliers → completed → the
 * restaurant downloads its invoice.
 */
async function sign(page: Page) {
  const pad = page.getByRole("img", { name: /Customer signature/ });
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 100);
  await page.mouse.down();
  for (const [dx, dy] of [[60, -40], [120, 20], [180, -30], [240, 10]]) await page.mouse.move(box.x + 30 + dx, box.y + 100 + dy, { steps: 4 });
  await page.mouse.up();
}

test("register → approve → order → split → driver proof → payments both ways → invoice", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const email = `e2e-journey-${stamp}@example.com`;
  const name = `E2E Journey Kitchen ${stamp}`;

  // 1. Register and confirm the email: pending review.
  await page.goto("/register", { waitUntil: "load" });
  await page.getByLabel("Restaurant or business name").fill(name);
  await page.getByLabel("Your name").fill("Jo Journey");
  await page.getByLabel("Phone").fill("07700 900777");
  await page.getByLabel("Address line 1").fill("7 Journey Lane");
  await page.getByLabel("Town or city").fill("London");
  await page.getByLabel("Postcode").fill("E1 6AN");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('input[name="confirm_password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Create trade account" }).click();
  await expect(page).toHaveURL(/\/register\/pending$/);
  await page.goto(await emailLink(email, "Confirm your email"), { waitUntil: "load" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thanks, we're reviewing your account");

  // 2. Admin approves with Rice and Drinks at a 10% margin.
  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, "admin@example.com");
  await admin.goto("/admin/approvals");
  await admin.getByRole("link", { name: new RegExp(name) }).click();
  const cats = admin.getByRole("group", { name: "Categories they can see" });
  for (const box of await cats.getByRole("checkbox").all()) await box.uncheck();
  await cats.getByRole("checkbox", { name: "Rice" }).check();
  await cats.getByRole("checkbox", { name: "Drinks" }).check();
  await admin.getByLabel("Default margin (%)").fill("10");
  await admin.getByRole("button", { name: "Approve account" }).click();
  await expect(admin.getByText("Approved.", { exact: true })).toBeVisible();

  // 3. The restaurant orders rice (supplier A) and mango drink (supplier B) at its own prices:
  //    rice 20 kg £42.00 + 10% = £46.20, mango £14.50 + 10% = £15.95.
  // Confirming the email signed them in; once approved, they land in their shop.
  await page.goto("/login", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/shop$/);
  await page.goto("/shop/p/basant-basmati-rice");
  await page.getByLabel("Pack size").selectOption({ label: "20 kg · £46.20" });
  await page.getByRole("textbox", { name: "Quantity of Basant Basmati Rice 20 kg", exact: true }).fill("2");
  await page.getByRole("button", { name: "Add Basant Basmati Rice 20 kg to basket" }).click();
  await expect(page.getByText("Added 2 × Basant Basmati Rice 20 kg")).toBeVisible();
  await page.goto("/shop/p/mango-drink");
  await page.getByRole("textbox", { name: "Quantity of Mango Drink 330 ml × 24", exact: true }).fill("3");
  await page.getByRole("button", { name: "Add Mango Drink 330 ml × 24 to basket" }).click();
  await expect(page.getByText("Added 3 × Mango Drink 330 ml × 24")).toBeVisible();
  await page.goto("/basket");
  // Goods £140.25 < £150: £12 delivery. VAT £9.57 on the drink + 82p on delivery (apportioned).
  await expect(page.getByTestId("basket-total")).toHaveText("£162.64");
  await page.getByRole("button", { name: /^Place order/ }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}\/confirmed$/);
  const orderId = /\/orders\/([0-9a-f-]{36})\//.exec(page.url())![1];

  // 4. Split by supplier.
  const parts = await sql<{ id: string; supplier: string }>(
    "select so.id, s.name supplier from supplier_orders so join suppliers s on s.id = so.supplier_id where so.order_id = $1 order by s.name", [orderId]);
  expect(parts.map((p) => p.supplier)).toEqual(["Dev Supplier A", "Dev Supplier B"]);
  const [{ number }] = await sql<{ number: number }>("select number::int number from orders where id = $1", [orderId]);
  const ref = `ORDER-${number}`;

  // 5. Supplier A accepts and sends a driver link; the driver submits from a phone.
  const sa = await (await browser.newContext()).newPage();
  await signIn(sa, "supplier.a@example.com");
  await sa.goto(`/supplier/orders/${parts[0].id}`);
  await expect(sa.getByRole("heading", { level: 1, name: ref })).toBeVisible();
  await sa.getByRole("button", { name: "Accept order" }).click();
  await expect(sa.getByText("With the supplier").first()).toBeVisible();
  await sa.getByRole("button", { name: "Make driver link" }).click();
  const link = new URL((await sa.getByTestId("driver-link").textContent())!).pathname;
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const d = await phone.newPage();
  await d.goto(link);
  await expect(d.getByRole("heading", { name })).toBeVisible();
  await d.locator("#proof-photo").setInputFiles("tests/fixtures/delivery-photo.jpg");
  await expect(d.getByRole("img", { name: "Delivery photo preview" })).toBeVisible();
  await sign(d);
  await d.getByRole("button", { name: "Submit proof of delivery" }).click();
  await expect(d.getByRole("heading", { name: "Delivery recorded" })).toBeVisible();
  await phone.close();

  // 6. Supplier B uploads its own proof (photo + signed note as PDF).
  const sb = await (await browser.newContext()).newPage();
  await signIn(sb, "supplier.b@example.com");
  await sb.goto(`/supplier/orders/${parts[1].id}`);
  await sb.getByText("Upload the proof yourself").click();
  await sb.locator("#proof-photo").setInputFiles("tests/fixtures/delivery-photo.jpg");
  await sb.locator("#proof-document").setInputFiles("tests/fixtures/signed-note.pdf");
  await sb.getByRole("button", { name: "Save proof and mark delivered" }).click();
  await expect(sb.getByRole("heading", { name: "Proof of delivery" })).toBeVisible();

  // The restaurant sees both proofs.
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByRole("heading", { name: "Proof of delivery" })).toHaveCount(2);

  // 7. Admin records the restaurant's payment in full and pays both suppliers, then completes.
  await admin.goto(`/admin/orders/${orderId}`);
  await expect(admin.getByText("Delivered").first()).toBeVisible();
  const pay = admin.locator("form:has(input[name='refund'])");
  await expect(pay.locator("input[name='amount']")).toHaveValue("162.64");
  await pay.locator("input[name='reference']").fill(ref);
  await pay.getByRole("button", { name: "Record payment" }).click();
  await expect(admin.getByText("Payment recorded.")).toBeVisible();
  for (const supplier of ["Dev Supplier A", "Dev Supplier B"]) {
    const part = admin.getByTestId(`part-${supplier}`);
    await part.getByText(`Record a payment to ${supplier}`).click();
    await part.getByRole("button", { name: "Record supplier payment" }).click();
    await expect(part.getByRole("button", { name: "Mark not paid" })).toBeVisible();
  }
  // Owed (D6): A 2 × £42.00 = £84.00 (0%); B 3 × £14.50 + 20% = £52.20.
  const paid = await sql<{ supplier: string; paid: boolean; amount: number }>(
    `select s.name supplier, so.paid_to_supplier paid, (select sum(amount_pence)::int from supplier_payments p where p.supplier_order_id = so.id) amount
       from supplier_orders so join suppliers s on s.id = so.supplier_id where so.order_id = $1 order by s.name`, [orderId]);
  expect(paid).toEqual([
    { supplier: "Dev Supplier A", paid: true, amount: 8400 },
    { supplier: "Dev Supplier B", paid: true, amount: 5220 },
  ]);
  await admin.getByRole("button", { name: "Mark completed" }).click();
  await expect(admin.getByText("Order marked completed.")).toBeVisible();

  // 8. The restaurant downloads its invoice: paid in full.
  await page.goto("/invoices");
  const pdfLink = page.getByRole("link", { name: /^PDF of INV-/ }).first();
  const res = await page.request.get((await pdfLink.getAttribute("href"))!);
  expect(res.status()).toBe(200);
  const file = path.join(mkdtempSync(path.join(tmpdir(), "inv-")), "x.pdf");
  writeFileSync(file, await res.body());
  const text = execFileSync("pdftotext", ["-layout", file, "-"]).toString();
  for (const s of [ref, name, "£162.64", "Paid", "£0.00"]) expect(text, s).toContain(s);
  const [o] = await sql<{ status: string }>("select status::text from orders where id = $1", [orderId]);
  expect(o.status).toBe("completed");
});
