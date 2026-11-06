import { expect, test } from "@playwright/test";
import { emailLink, followEmailLink, PASSWORD, signIn, signOut, sql } from "./helpers";

/** Phase 14: the client could not find "add a product"; audit fixes for the loops found around it. */

const A = "20000000-0000-4000-a000-000000000001";

test.describe("admin can always reach 'add a product'", () => {
  test("on a phone the Menu opens every section, and Products leads to New product", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "admin@example.com");
    await expect(page).toHaveURL(/\/admin$/);
    // Dashboard shortcut, visible without scrolling the page.
    await expect(page.getByRole("link", { name: "Add a product" })).toBeInViewport();

    const menu = page.getByRole("button", { name: /Menu, current section: Dashboard/ });
    await menu.click();
    for (const name of ["Orders", "Customers", "Products", "Categories", "Suppliers", "Settings"]) {
      await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name, exact: true }).last()).toBeVisible();
    }
    await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Products", exact: true }).last().click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(page.getByRole("button", { name: /Menu, current section: Products/ })).toBeVisible();
    await page.getByRole("link", { name: "New product" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/new$/);
  });

  test("a category page adds a product straight into that category", async ({ page }) => {
    await signIn(page, "admin@example.com");
    const [cat] = await sql<{ id: string; name: string }>("select id, name from categories where slug = 'rice'");
    await page.goto(`/admin/categories/${cat.id}`, { waitUntil: "load" });
    await page.getByRole("link", { name: "Add a product" }).click();
    await expect(page.getByLabel("Category")).toHaveValue(cat.id);
    const name = `E2E Phase14 Rice ${Date.now()}`;
    await page.getByLabel("Product name").fill(name);
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}\?notice=created$/);
    await expect(page.getByText("Product created. Now add its pack sizes and costs.")).toBeVisible();
    const [row] = await sql<{ category_id: string }>("select category_id from products where name = $1", [name]);
    expect(row.category_id).toBe(cat.id);
    // Visible but nothing to order yet: the admin is told so on the next visit.
    await page.goto(page.url().replace(/\?notice=created$/, ""), { waitUntil: "load" });
    await expect(page.getByText("Restaurants cannot order this yet")).toBeVisible();
    await expect(page.getByRole("link", { name: "Add another product" })).toHaveAttribute("href", `/admin/products/new?category=${cat.id}`);
  });
});

test.describe.serial("admin manages restaurant logins", () => {
  const email = `e2e-p14-login-${Date.now()}@example.com`;

  test("set a new password, switch the login off and on", async ({ page, browser }) => {
    await signIn(page, "admin@example.com");
    const customerId = (await sql<{ id: string }>("select id from customers where business_name = 'Dev Restaurant A'"))[0].id;
    // Make a login for Restaurant A with a known password through the Auth admin API.
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321", process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    await sql("update profiles set role = 'customer', customer_id = $1, full_name = 'P14 Login' where id = $2", [customerId, data.user!.id]);

    await page.goto(`/admin/customers/${customerId}`, { waitUntil: "load" });
    const row = page.getByRole("listitem").filter({ hasText: email });
    await row.getByText("Set a new password").click();
    await row.getByLabel(`New password for ${email}`).fill("short");
    await row.getByRole("button", { name: "Save new password" }).click();
    await expect(row.getByText("Use at least 8 characters")).toBeVisible();
    await row.getByLabel(`New password for ${email}`).fill("Fresh-pass-2026");
    await row.getByRole("button", { name: "Save new password" }).click();
    await expect(row.getByText("New password saved.")).toBeVisible();

    const other = await browser.newPage();
    await signIn(other, email, "Fresh-pass-2026");
    await expect(other).toHaveURL(/\/shop$/);
    await signOut(other);

    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Switch off" }).click();
    await expect(row.getByText("Off", { exact: true })).toBeVisible();
    await signIn(other, email, "Fresh-pass-2026");
    await expect(other).toHaveURL(/\/account-disabled$/);
    await other.close();

    await row.getByRole("button", { name: "Switch on" }).click();
    await expect(row.getByText("Off", { exact: true })).toHaveCount(0);
  });

  test.afterAll(async () => {
    await sql("update profiles set active = false, customer_id = null where email = $1", [email]);
  });
});

test("order again puts a past order back in the basket", async ({ page }) => {
  await sql("delete from basket_items where customer_id = $1", [A]);
  await signIn(page, "restaurant.a@example.com");
  await page.goto("/shop/p/mango-drink", { waitUntil: "load" });
  await page.getByRole("button", { name: "Add Mango Drink 330 ml × 24 to basket" }).click();
  await expect.poll(async () => (await sql("select 1 from basket_items where customer_id = $1", [A])).length).toBe(1);
  await page.goto("/basket", { waitUntil: "load" });
  await page.getByRole("button", { name: /^Place order/ }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}\/confirmed$/);
  const orderId = /\/orders\/([0-9a-f-]{36})\//.exec(page.url())![1];
  expect(await sql("select 1 from basket_items where customer_id = $1", [A])).toHaveLength(0);

  await page.goto(`/orders/${orderId}`, { waitUntil: "load" });
  await page.getByRole("button", { name: "Order again" }).click();
  await expect(page).toHaveURL(/\/basket$/);
  await expect(page.getByText("Mango Drink").first()).toBeVisible();
  expect(await sql("select qty from basket_items where customer_id = $1", [A])).toEqual([{ qty: 1 }]);
  await sql("delete from basket_items where customer_id = $1", [A]);
});

test("opening an email link does not use it up; pressing the button does", async ({ page, request }) => {
  const email = `e2e-p14-reset-${Date.now()}@example.com`;
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321", process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  await page.goto("/forgot-password", { waitUntil: "load" });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  const link = await emailLink(email, "Reset your password");

  // A mail scanner fetches the link twice; nothing is spent.
  expect((await request.get(link)).status()).toBe(200);
  expect((await request.get(link)).status()).toBe(200);
  await followEmailLink(page, link);
  await expect(page).toHaveURL(/\/reset-password$/);
});

test("a product link's Sign in comes back to the same product", async ({ page }) => {
  await page.goto("/catalogue/mango-drink", { waitUntil: "load" });
  await page.getByRole("main").getByRole("link", { name: "Sign in" }).first().click();
  await expect(page).toHaveURL(/\/login\?next=%2Fshop%2Fp%2Fmango-drink$/);
  await sql("update public.rate_limits set count = 0 where key like 'login%'");
  await page.getByLabel("Email").fill("restaurant.a@example.com");
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/shop\/p\/mango-drink$/);
});
