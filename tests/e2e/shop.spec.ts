import { expect, test, type Page } from "@playwright/test";
import { signIn, sql } from "./helpers";

const A = "20000000-0000-4000-a000-000000000001";
const B = "20000000-0000-4000-a000-000000000002";
const RICE_20 = "50000000-0000-4000-a000-000000000002";
const MANGO = "50000000-0000-4000-a000-000000000003";
const CARDAMOM = "50000000-0000-4000-a000-000000000004";

async function emptyBasket(customerId: string) {
  await sql("delete from basket_items where customer_id = $1", [customerId]);
}

function row(page: Page, name: string) {
  return page.getByRole("main").getByRole("listitem").filter({ has: page.getByRole("link", { name, exact: true }) });
}

test.describe("shop", () => {
  test.afterAll(async () => {
    await sql("update customer_price_overrides set price_pence = 1700 where customer_id = $1 and variant_id = $2", [A, MANGO]);
    await emptyBasket(A);
    await emptyBasket(B);
  });

  test.beforeEach(async () => {
    await emptyBasket(A);
    await emptyBasket(B);
    await sql("update customer_price_overrides set price_pence = 1700 where customer_id = $1 and variant_id = $2", [A, MANGO]);
  });

  test("order across two suppliers: own prices, live delivery charge and VAT, split and snapshot", async ({ page }) => {
    await signIn(page, "restaurant.a@example.com");
    await expect(page).toHaveURL(/\/shop$/);

    // Own prices: rice at Rice margin 10% (cost £12 -> £13.20), mango drink at the fixed £17.00.
    await page.getByRole("searchbox", { name: "Search your catalogue" }).fill("basant");
    await page.getByRole("button", { name: "Search" }).click();
    const rice = row(page, "Basant Basmati Rice");
    await expect(rice).toContainText("£13.20");
    await rice.getByLabel("Size of Basant Basmati Rice").selectOption({ label: "20 kg · £46.20" });
    await expect(rice).toContainText("£46.20");
    await rice.getByRole("button", { name: "One more: Quantity of Basant Basmati Rice 20 kg" }).click();
    await rice.getByRole("button", { name: "Add Basant Basmati Rice 20 kg to basket" }).click();
    await expect(page.getByText("Added 2 × Basant Basmati Rice 20 kg")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Account" }).first().getByRole("link", { name: /Basket/ })).toContainText("1");

    await page.goto("/shop/p/mango-drink");
    await expect(page.getByRole("heading", { level: 1, name: "Mango Drink" })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("£20.40"); // £17.00 + 20% VAT
    await page.getByRole("textbox", { name: "Quantity of Mango Drink 330 ml × 24", exact: true }).fill("3");
    await page.getByRole("button", { name: "Add Mango Drink 330 ml × 24 to basket" }).click();
    await expect(page.getByText("Added 3 × Mango Drink 330 ml × 24")).toBeVisible();

    // Basket: goods £143.40 < £150, so £12 delivery; VAT £10.20 + 85p apportioned delivery VAT.
    await page.goto("/basket");
    const total = page.getByTestId("basket-total");
    await expect(total).toHaveText("£166.45");
    await expect(page.getByText("Add £6.60 more for free delivery")).toBeVisible();
    // One more bag of rice crosses the minimum: delivery free, live.
    await page.getByRole("button", { name: "One more: Quantity of Basant Basmati Rice 20 kg" }).click();
    await expect(page.getByText("Free delivery", { exact: true })).toBeVisible();
    await expect(total).toHaveText("£199.80");
    await page.getByRole("button", { name: "One less: Quantity of Basant Basmati Rice 20 kg" }).click();
    await expect(total).toHaveText("£166.45");
    // Wait for the quantity to be saved before reloading.
    await expect.poll(async () => (await sql<{ qty: number }>("select qty from basket_items where customer_id = $1 and variant_id = $2", [A, RICE_20]))[0]?.qty).toBe(2);
    await page.reload();
    await expect(total).toHaveText("£166.45");

    await page.getByLabel("Within 7 days").check();
    await page.getByLabel("Note for this order (optional)").fill("Back door, ring the bell.");
    await page.getByRole("button", { name: /^Place order/ }).click();

    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}\/confirmed$/);
    const orderId = /\/orders\/([0-9a-f-]{36})\//.exec(page.url())![1];
    const [o] = await sql<{ number: string; total: number; terms: string; pay: string; delivery: string; note: string; key: string | null }>(
      "select number::text, total_pence::int total, payment_terms::text terms, promised_pay_date::text pay, delivery_date::text delivery, note, checkout_key::text key from orders where id = $1",
      [orderId],
    );
    await expect(page.getByRole("heading", { name: `Order ORDER-${o.number} placed` })).toBeVisible();
    await expect(page.getByText("It will arrive in 2 deliveries")).toBeVisible();
    await expect(page.getByText(`ORDER-${o.number}`, { exact: true })).toBeVisible();
    expect(o.total).toBe(16645);
    expect(o.terms).toBe("within_7_days");
    expect(o.note).toBe("Back door, ring the bell.");
    expect(o.key).not.toBeNull();
    const [{ diff }] = await sql<{ diff: number }>("select ($1::date - $2::date) diff", [o.pay, o.delivery]);
    expect(diff).toBe(7);

    // Split by supplier, with price, cost, VAT and supplier snapshotted on every line.
    const lines = await sql<{ supplier: string; product_name: string; qty: number; price: number; cost: number; vat: number }>(
      `select s.name supplier, oi.product_name, oi.qty, oi.unit_price_pence::int price, oi.unit_cost_pence::int cost, oi.vat_rate_bp vat
         from order_items oi join suppliers s on s.id = oi.supplier_id where oi.order_id = $1 order by oi.sort`,
      [orderId],
    );
    expect(lines).toEqual([
      { supplier: "Dev Supplier A", product_name: "Basant Basmati Rice", qty: 2, price: 4620, cost: 4200, vat: 0 },
      { supplier: "Dev Supplier B", product_name: "Mango Drink", qty: 3, price: 1700, cost: 1450, vat: 2000 },
    ]);
    const parts = await sql<{ n: number }>("select count(*)::int n from supplier_orders where order_id = $1", [orderId]);
    expect(parts[0].n).toBe(2);
    const notes = await sql<{ email: string }>(
      `select p.email from notifications n join profiles p on p.id = n.user_id where n.title = $1 order by p.email`,
      [`New order ORDER-${o.number}`],
    );
    expect(notes.map((n) => n.email)).toEqual(["supplier.a@example.com", "supplier.b@example.com"]);
    const basket = await sql("select 1 from basket_items where customer_id = $1", [A]);
    expect(basket).toHaveLength(0);

    // History and detail.
    await page.getByRole("link", { name: "View order" }).click();
    await expect(page.getByRole("heading", { level: 1, name: `ORDER-${o.number}` })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Delivery 1 of 2/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Delivery 2 of 2/ })).toBeVisible();
    await expect(page.getByText("Back door, ring the bell.")).toBeVisible();
    await page.goto("/orders");
    await expect(page.getByRole("link", { name: new RegExp(`ORDER-${o.number}`) })).toBeVisible();

    // Prices change later; the order does not.
    await sql("update customer_price_overrides set price_pence = 1900 where customer_id = $1 and variant_id = $2", [A, MANGO]);
    await page.goto(`/orders/${orderId}`);
    await expect(page.getByText("3 × £17.00")).toBeVisible();
  });

  test("a price that changes before checkout is not charged silently", async ({ page }) => {
    await sql("insert into basket_items (customer_id, variant_id, qty) values ($1, $2, 10)", [A, MANGO]);
    await signIn(page, "restaurant.a@example.com");
    await page.goto("/basket");
    await expect(page.getByTestId("basket-total")).toHaveText("£204.00"); // 10 × £17 + 20% VAT, free delivery
    await sql("update customer_price_overrides set price_pence = 1800 where customer_id = $1 and variant_id = $2", [A, MANGO]);
    await page.getByRole("button", { name: /^Place order/ }).click();
    await expect(page.getByText("Your basket or prices changed. Check the new total, then place the order again.")).toBeVisible();
    await expect(page.getByTestId("basket-total")).toHaveText("£216.00");
    await page.getByRole("button", { name: "Place order · £216.00" }).click();
    await expect(page).toHaveURL(/\/confirmed$/);
    const orderId = /\/orders\/([0-9a-f-]{36})\//.exec(page.url())![1];
    const [o] = await sql<{ total: number }>("select total_pence::int total from orders where id = $1", [orderId]);
    expect(o.total).toBe(21600);
  });

  test("each restaurant sees only its own list; unpriced and hidden items cannot be ordered", async ({ page, browser }) => {
    // Restaurant B: no Whole Spices, so cardamom does not exist for them; rice at the global 20%.
    await signIn(page, "restaurant.b@example.com");
    await page.goto("/shop?q=basant");
    await expect(row(page, "Basant Basmati Rice")).toContainText("£14.40");
    expect((await page.goto("/shop/p/green-cardamom"))?.status()).toBe(404);
    // A row slipped into the basket through the API is flagged and blocks checkout.
    await sql("insert into basket_items (customer_id, variant_id, qty) values ($1, $2, 1)", [B, CARDAMOM]);
    await page.goto("/basket");
    await expect(page.getByText("No longer on your list")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Place order/ })).toBeDisabled();
    await page.getByRole("button", { name: "Remove Green Cardamom 100 g" }).click();
    await expect(page.getByText("Your basket is empty")).toBeVisible();

    // Restaurant A sees cardamom, but it has no cost and no fixed price yet.
    const ctx = await browser.newContext();
    const a = await ctx.newPage();
    await signIn(a, "restaurant.a@example.com");
    await a.goto("/shop/p/green-cardamom");
    await expect(a.getByText("Price on request").first()).toBeVisible();
    await expect(a.getByRole("button", { name: /to basket/ })).toHaveCount(0);
    await ctx.close();
  });

  test("no cost, margin, supplier or other restaurant's price reaches the restaurant's browser", async ({ page }) => {
    await sql("insert into basket_items (customer_id, variant_id, qty) values ($1, $2, 2), ($1, $3, 1)", [A, RICE_20, MANGO]);
    await signIn(page, "restaurant.a@example.com");
    // Field names that would carry secrets, supplier identity and admin notes, costs (rice 20 kg
    // £42.00, mango £14.50) and restaurant B's prices (rice £14.40 / £50.40, mango £17.40).
    const leaks = ["cost_pence", "costPence", "unitCost", "margin_bp", "marginBp", "supplier_id", "supplierId", "Dev Supplier", "ADMIN NOTE", "£42.00", "£14.50", "£14.40", "£50.40", "£17.40"];
    for (const path of ["/shop", "/shop?q=basant", "/shop/p/basant-basmati-rice", "/shop/p/mango-drink", "/basket"]) {
      for (const rsc of [false, true]) {
        const res = await page.request.get(path, { headers: rsc ? { RSC: "1" } : {} });
        expect(res.status(), path).toBe(200);
        const body = await res.text();
        for (const word of leaks) expect(body.includes(word), `${path}${rsc ? " (RSC)" : ""} contains ${word}`).toBe(false);
      }
    }
  });
});
