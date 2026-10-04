import { expect, test, type Page } from "@playwright/test";
import { registeredRestaurant, signIn, sql } from "./helpers";

async function openCustomer(page: Page, name: string) {
  await page.goto("/admin/customers");
  await page.getByRole("searchbox", { name: "Search customers" }).fill(name);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: new RegExp(name) }).first().click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test.describe("approvals", () => {
  test("approve a registration with chosen categories and a margin; the restaurant then sees only those", async ({ page, browser }) => {
    const email = `e2e-approve-${Date.now()}@example.com`;
    const name = `E2E Spice Route ${Date.now()}`;
    const id = await registeredRestaurant(email, name);

    await signIn(page, "admin@example.com");
    await page.goto("/admin/approvals");
    await page.getByRole("link", { name: new RegExp(name) }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/customers/${id}$`));
    await expect(page.getByText("Awaiting approval")).toBeVisible();

    // Only Rice and Drinks, default margin 25%.
    const cats = page.getByRole("group", { name: "Categories they can see" });
    for (const box of await cats.getByRole("checkbox").all()) await box.uncheck();
    await cats.getByRole("checkbox", { name: "Rice" }).check();
    await cats.getByRole("checkbox", { name: "Drinks" }).check();
    await page.getByLabel("Default margin (%)").fill("25");
    await page.getByRole("button", { name: "Approve account" }).click();
    await expect(page.getByText("Approved.", { exact: true })).toBeVisible();
    await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();

    const access = await sql<{ slug: string }>(
      "select c.slug from customer_category_access a join categories c on c.id = a.category_id where a.customer_id = $1 order by c.slug",
      [id],
    );
    expect(access.map((a) => a.slug)).toEqual(["drinks", "rice"]);
    const [priv] = await sql<{ default_margin_bp: number }>("select default_margin_bp from customer_private where customer_id = $1", [id]);
    expect(priv.default_margin_bp).toBe(2500);
    const mail = await sql<{ template: string; status: string }>("select template, status from email_log where entity_id = $1", [id]);
    expect(mail).toEqual([{ template: "account_approved", status: "queued" }]);

    const ctx = await browser.newContext();
    const shop = await ctx.newPage();
    await signIn(shop, email);
    await expect(shop).toHaveURL(/\/shop$/);
    const shopCats = shop.getByRole("navigation", { name: "Categories" });
    await expect(shopCats.getByRole("link")).toHaveText([/^All/, /^Rice/, /^Drinks/]);
    await ctx.close();
  });

  test("reject with a reason the restaurant sees; hold and reactivate an approved account", async ({ page, browser }) => {
    const email = `e2e-reject-${Date.now()}@example.com`;
    const name = `E2E Far Away Diner ${Date.now()}`;
    await registeredRestaurant(email, name);
    await signIn(page, "admin@example.com");
    await openCustomer(page, name);

    await page.getByRole("button", { name: "Reject", exact: true }).click();
    await page.getByRole("button", { name: "Reject application" }).click();
    await expect(page.getByText("Give a reason. The restaurant sees it on their account page.")).toBeVisible();
    await page.getByLabel("Reason (the restaurant sees this)").fill("We only deliver inside the M25 for now.");
    await page.getByRole("button", { name: "Reject application" }).click();
    await expect(page.getByText("Application rejected.")).toBeVisible();

    const ctx = await browser.newContext();
    const r = await ctx.newPage();
    await r.goto("/login");
    await r.getByLabel("Email").fill(email);
    await r.locator('input[name="password"]').fill("Password123!");
    await r.getByRole("button", { name: "Sign in" }).click();
    await expect(r).toHaveURL(/\/register\/pending$/);
    await expect(r.getByText("We only deliver inside the M25 for now.")).toBeVisible();

    // Change of heart: approve after all, then put on hold, then reactivate.
    await page.getByRole("button", { name: "Approve after all" }).click();
    await expect(page.getByText("Approved.", { exact: true })).toBeVisible();
    await page.getByLabel("Put on hold: reason (they see this)").fill("On hold until the last invoice is paid.");
    await page.getByRole("button", { name: "Put account on hold" }).click();
    await expect(page.getByText("Account put on hold.")).toBeVisible();
    await r.goto("/shop");
    await expect(r).toHaveURL(/\/register\/pending$/);
    await expect(r.getByText("On hold until the last invoice is paid.")).toBeVisible();

    await page.getByRole("button", { name: "Reactivate account" }).click();
    await expect(page.getByText("Account reactivated.")).toBeVisible();
    await r.goto("/shop");
    await expect(r).toHaveURL(/\/shop$/);
    await ctx.close();
  });
});

test.describe("catalogue & prices", () => {
  test("live preview, save, reload; copy to a new customer; non-admins are refused", async ({ page, browser }) => {
    const stamp = Date.now();
    const email = `e2e-pricing-${stamp}@example.com`;
    const name = `E2E Pricing Kitchen ${stamp}`;
    const id = await registeredRestaurant(email, name);
    await sql("update customers set status = 'approved' where id = $1", [id]);
    await sql("insert into customer_category_access (customer_id, category_id) select $1, id from categories where slug in ('rice', 'drinks')", [id]);

    await signIn(page, "admin@example.com");
    await page.goto(`/admin/customers/${id}/pricing`);
    await page.getByRole("searchbox", { name: "Search products" }).fill("basant");
    const basant = page.getByRole("listitem").filter({ hasText: "Basant Basmati Rice" });
    // Global 20% on a £12.00 cost.
    await expect(basant.getByRole("row", { name: /^5 kg/ })).toContainText("£14.40");

    await page.getByLabel("Default margin per cent").fill("25");
    await expect(basant.getByRole("row", { name: /^5 kg/ })).toContainText("£15.00");
    await page.getByLabel("Rice margin per cent").fill("12.5");
    await expect(basant.getByRole("row", { name: /^5 kg/ })).toContainText("£13.50");
    await expect(basant.getByRole("row", { name: /^5 kg/ })).toContainText("Rice margin 12.5%");
    await page.getByLabel("Fixed price for Basant Basmati Rice 20 kg").fill("45");
    await expect(basant.getByRole("row", { name: /^20 kg/ })).toContainText("£45.00");
    await page.getByLabel("Fixed price for Basant Basmati Rice 10 kg").fill("abc");
    await expect(page.getByText("Fix the highlighted values to save.")).toBeVisible();
    await page.getByLabel("Fixed price for Basant Basmati Rice 10 kg").fill("");

    await page.getByRole("searchbox", { name: "Search products" }).fill("mango drink");
    await page.getByLabel("Visibility of Mango Drink").selectOption("deny");
    await page.getByRole("searchbox", { name: "Search products" }).fill("cardamom");
    await page.getByLabel("Visibility of Green Cardamom").selectOption("allow");

    await expect(page.getByText("5 unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(/^Saved\./)).toBeVisible();

    const saved = await sql<{ k: string; v: string }>(
      `select 'default' k, default_margin_bp::text v from customer_private where customer_id = $1
       union all select 'margin:' || c.slug, m.margin_bp::text from customer_category_margins m join categories c on c.id = m.category_id where m.customer_id = $1
       union all select 'price:' || p.name || ' ' || v.size_label, o.price_pence::text from customer_price_overrides o join product_variants v on v.id = o.variant_id join products p on p.id = v.product_id where o.customer_id = $1
       union all select 'rule:' || p.name, r.mode::text from customer_product_rules r join products p on p.id = r.product_id where r.customer_id = $1
       order by 1`,
      [id],
    );
    expect(saved).toEqual([
      { k: "default", v: "2500" },
      { k: "margin:rice", v: "1250" },
      { k: "price:Basant Basmati Rice 20 kg", v: "4500" },
      { k: "rule:Green Cardamom", v: "allow" },
      { k: "rule:Mango Drink", v: "deny" },
    ]);

    // Reload: everything persisted, nothing unsaved.
    await page.reload();
    await expect(page.getByLabel("Rice margin per cent")).toHaveValue("12.5");
    await expect(page.getByText(/unsaved change/)).toBeHidden();

    // New customer (no invite) gets every category; copy the pricing over.
    const target = `E2E Copy Target ${stamp}`;
    await page.goto("/admin/customers/new");
    await page.getByLabel("Restaurant or business name").fill(target);
    await page.getByLabel(/Email the contact an invitation/).uncheck();
    await page.getByRole("button", { name: "Add restaurant" }).click();
    await expect(page.getByText(/Restaurant added and approved with every category/)).toBeVisible();
    const [{ id: targetId }] = await sql<{ id: string }>("select id from customers where business_name = $1", [target]);
    await page.getByRole("link", { name: "Catalogue & prices" }).click();
    await page.getByRole("combobox").filter({ hasText: "Choose a restaurant" }).selectOption({ label: name });
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Copy prices" }).click();
    await expect(page.getByText(`Copied catalogue and prices from ${name}.`)).toBeVisible();
    const snapshot = async (cid: string) =>
      sql(
        `select (select default_margin_bp from customer_private where customer_id = $1) d,
                (select array_agg(category_id order by category_id) from customer_category_access where customer_id = $1) a,
                (select array_agg(category_id || ':' || margin_bp order by category_id) from customer_category_margins where customer_id = $1) m,
                (select array_agg(variant_id || ':' || price_pence order by variant_id) from customer_price_overrides where customer_id = $1) o,
                (select array_agg(product_id || ':' || mode order by product_id) from customer_product_rules where customer_id = $1) r`,
        [cid],
      );
    expect(await snapshot(targetId)).toEqual(await snapshot(id));

    // A restaurant cannot reach any of this.
    const ctx = await browser.newContext();
    const r = await ctx.newPage();
    await signIn(r, "restaurant.a@example.com");
    for (const path of [`/admin/customers/${id}/pricing`, "/admin/customers", "/admin/approvals", "/admin/settings"]) {
      expect((await r.goto(path))?.status(), path).toBe(403);
    }
    await ctx.close();
  });
});

test.describe("settings", () => {
  test("change the global margin and see it used; bad input is refused", async ({ page }) => {
    await signIn(page, "admin@example.com");
    await page.goto("/admin/settings");
    await expect(page.getByText(/business or bank details are still placeholders/)).toBeVisible();
    await page.getByLabel("Global margin (%)").fill("abc");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Enter a margin like 20 or 17.5 (per cent)")).toBeVisible();
    await page.getByLabel("Global margin (%)").fill("22.5");
    for (const d of ["Sat", "Sun"]) await page.getByRole("checkbox", { name: d }).uncheck();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved.")).toBeVisible();
    const [s] = await sql<{ global_margin_bp: number; delivery_days: number[] }>("select global_margin_bp, delivery_days from settings");
    expect(s).toEqual({ global_margin_bp: 2250, delivery_days: [1, 2, 3, 4, 5] });

    await page.goto("/admin/customers/20000000-0000-4000-a000-000000000002/pricing");
    await expect(page.getByText(/then the global margin \(22\.5%\)/)).toBeVisible();

    await sql("update settings set global_margin_bp = 2000, delivery_days = '{1,2,3,4,5,6}'");
  });
});
