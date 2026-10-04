import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { signIn, sql } from "./helpers";

// A real 2x2 PNG (the server checks the bytes, not the file name).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNk+M/AwMDAwMDAwMAAAAQSAAHaKZo9AAAAAElFTkSuQmCC",
  "base64",
);

/** Things that must never appear on a public page: currency, cost fields, seed costs/prices. */
const LEAKS = [/£/, /cost_pence/, /price_pence/, /margin_bp/, /unit_cost/, /\b12\.00\b/, /\b42\.00\b/, /\b17\.00\b/, /\b7\.35\b/];

async function assertNoPrices(request: APIRequestContext, url: string) {
  const html = await (await request.get(url)).text();
  const rsc = await request.get(url, { headers: { RSC: "1" } });
  expect(rsc.headers()["content-type"]).toContain("text/x-component");
  const flight = await rsc.text();
  for (const re of LEAKS) {
    expect(html, `${url} HTML contains ${re}`).not.toMatch(re);
    expect(flight, `${url} RSC payload contains ${re}`).not.toMatch(re);
  }
}

test.describe("public catalogue", () => {
  test("home lists the categories from the database", async ({ page }) => {
    await page.goto("/");
    const drinks = page.getByRole("link", { name: /^Drinks/ });
    await expect(drinks).toBeVisible();
    await drinks.click();
    await expect(page).toHaveURL(/\/catalogue\?category=drinks$/);
    await expect(page.getByRole("heading", { level: 1, name: "Drinks" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Mango Drink/ })).toBeVisible();
  });

  test("browse, search, filter and paginate without ever seeing a price", async ({ page }) => {
    await page.goto("/catalogue");
    await expect(page.getByText(/Showing 1–24 of \d+/)).toBeVisible();
    await expect(page.getByText("Register to see price").first()).toBeVisible();

    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Showing 25–48 of/)).toBeVisible();

    await page.getByRole("searchbox", { name: "Search products" }).fill("basmati rice");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=basmati\+rice/);
    const results = page.getByRole("main").getByRole("listitem").filter({ has: page.getByRole("link", { name: /Basmati/ }) });
    await expect(results).toHaveCount(2);
    await expect(page.getByText(/for “basmati rice”/)).toBeVisible();

    await page.getByRole("navigation", { name: "Categories" }).getByRole("link", { name: /Drinks/ }).click();
    await expect(page.getByText("No products")).toBeVisible();
    await page.getByRole("link", { name: "Clear search" }).first().click();
    await expect(page).toHaveURL(/\/catalogue\?category=drinks$/);
    await expect(page.getByRole("link", { name: /Lychee Drink/ })).toBeVisible();
  });

  test("search treats wildcards literally and an unknown category is a 404", async ({ page, request }) => {
    // % and _ are never wildcards: "zzzz%" finds nothing rather than everything.
    await page.goto("/catalogue?q=zzzz%25_");
    await expect(page.getByText("Nothing matches that search")).toBeVisible();
    expect((await request.get("/catalogue?category=no-such-thing")).status()).toBe(404);
    expect((await request.get("/catalogue/no-such-product")).status()).toBe(404);
    expect((await request.get("/catalogue/..%2Fadmin")).status()).toBe(404);
  });

  test("product page shows sizes and asks to register; no price in HTML or RSC payload", async ({ page, request }) => {
    await page.goto("/catalogue/basant-basmati-rice");
    await expect(page.getByRole("heading", { level: 1, name: "Basant Basmati Rice" })).toBeVisible();
    const sizes = page.getByRole("region", { name: "Pack sizes" });
    for (const size of ["5 kg", "10 kg", "20 kg"]) await expect(sizes.getByText(size, { exact: true })).toBeVisible();
    await expect(page.locator("p", { hasText: "Register to see price" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "More in Rice" })).toBeVisible();
    for (const url of ["/catalogue", "/catalogue?category=rice", "/catalogue?q=mango", "/catalogue/basant-basmati-rice", "/catalogue/mango-drink"]) {
      await assertNoPrices(request, url);
    }
  });

  test("a signed-in restaurant still gets no price from the public pages", async ({ page }) => {
    await signIn(page, "restaurant.a@example.com");
    const res = await page.request.get("/catalogue/mango-drink", { headers: { RSC: "1" } });
    const body = await res.text();
    expect(body).not.toMatch(/£|17\.00|1700|price_pence/);
  });
});

async function adminProductPage(page: Page, name: string, category: string) {
  await page.goto("/admin/products/new");
  await page.getByLabel("Product name").fill(name);
  await page.getByLabel("Category").selectOption({ label: category });
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByText("Product created. Now add its pack sizes and costs.")).toBeVisible();
}

test.describe("admin catalogue", () => {
  test("create a category and product, price a size, upload a photo, publish, then hide", async ({ page, request }) => {
    const stamp = Date.now();
    const category = `E2E Frozen ${stamp}`;
    const product = `E2E Paratha ${stamp}`;
    await signIn(page, "admin@example.com");

    await page.goto("/admin/categories");
    await page.getByLabel("Name").fill(category);
    await page.getByRole("button", { name: "Add category" }).click();
    await expect(page.getByText("Category added.")).toBeVisible();

    await adminProductPage(page, product, category);
    await page.locator('input[name="v.0.size_label"]').fill("20 pcs");
    await page.locator('input[name="v.0.cost"]').fill("7.35");
    await page.locator('select[name="v.0.vat"]').selectOption("20");
    await page.getByRole("button", { name: "Add a size" }).click();
    await page.locator('input[name="v.1.size_label"]').fill("50 pcs");
    await page.getByRole("button", { name: "Save sizes" }).click();
    await expect(page.getByText("Sizes saved.")).toBeVisible();
    // The unpriced size is flagged; the priced one is not.
    await expect(page.getByText(/Needs price: restaurants cannot order/)).toHaveCount(1);

    // Re-saving keeps two sizes (new rows got ids; no duplicates).
    await page.getByRole("button", { name: "Save sizes" }).click();
    await expect(page.getByText("Sizes saved.")).toBeVisible();
    // Saving twice keeps every dropdown (regression: React's form reset used to clear supplier and VAT).
    await expect.poll(async () =>
      sql<{ size_label: string; cost_pence: number | null; vat_rate_bp: number; supplier: string | null }>(
        `select v.size_label, v.cost_pence::int as cost_pence, v.vat_rate_bp, s.name as supplier from public.product_variants v
           join public.products p on p.id = v.product_id left join public.suppliers s on s.id = v.supplier_id where p.name = $1 order by size_sort`,
        [product],
      ),
    ).toEqual([
      { size_label: "20 pcs", cost_pence: 735, vat_rate_bp: 2000, supplier: "Dev Supplier A" },
      { size_label: "50 pcs", cost_pence: null, vat_rate_bp: 0, supplier: "Dev Supplier A" },
    ]);
    await expect(page.locator('select[name="v.0.vat"]')).toHaveValue("20");

    // Bad cost is rejected on the right row.
    await page.locator('input[name="v.1.cost"]').fill("abc");
    await page.getByRole("button", { name: "Save sizes" }).click();
    await expect(page.getByText("Enter a cost like 12.50, or leave blank.")).toBeVisible();
    await page.locator('input[name="v.1.cost"]').fill("");

    // Photo: a text file renamed .png is refused; a real PNG is stored.
    await page.locator('input[name="photo"]').setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not an image at all") });
    await page.getByRole("button", { name: "Upload photo" }).click();
    await expect(page.getByText("Use a JPEG, PNG or WebP photo.")).toBeVisible();
    await page.locator('input[name="photo"]').setInputFiles({ name: "paratha.png", mimeType: "image/png", buffer: PNG });
    await page.getByRole("button", { name: "Upload photo" }).click();
    await expect(page.getByText("Photo updated.")).toBeVisible();

    // Public: visible in its category with the photo and both sizes, but no cost.
    const href = await page.getByRole("link", { name: "View on site" }).getAttribute("href");
    expect(href).toMatch(/^\/catalogue\/e2e-paratha-/);
    const pub = await page.context().browser()!.newPage();
    await pub.goto(href!);
    await expect(pub.getByRole("heading", { level: 1, name: product })).toBeVisible();
    await expect(pub.getByText("20 pcs", { exact: true })).toBeVisible();
    await expect(pub.getByText("50 pcs", { exact: true })).toBeVisible();
    const img = pub.getByRole("img", { name: product });
    await expect(img).toBeVisible();
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    await assertNoPrices(request, href!);
    await pub.getByRole("link", { name: category }).first().click();
    await expect(pub.getByRole("heading", { level: 1, name: category })).toBeVisible();
    await expect(pub.getByRole("link", { name: new RegExp(product) })).toBeVisible();
    await pub.close();

    // Hide it: the public page disappears straight away.
    await page.getByLabel("Visible in the catalogue").uncheck();
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expect(page.getByText(/Not on the site: this product is hidden/)).toBeVisible();
    expect((await request.get(href!)).status()).toBe(404);
  });

  test("import a CSV: preview, import, then a re-import adds nothing", async ({ page }) => {
    const stamp = Date.now();
    const file = path.join(tmpdir(), `e2e-import-${stamp}.csv`);
    writeFileSync(file, `category,name,size\nE2E Imports ${stamp},E2E CHAKKI ATTA 10 KG,\nE2E Imports ${stamp},E2E CHAKKI ATTA 25 KG,\nE2E Imports ${stamp},E2E ROSE SYRUP,750ML x 12\n,MISSING CATEGORY 1KG,\n`);
    await signIn(page, "admin@example.com");
    await page.goto("/admin/products/import");
    await page.locator('input[type="file"]').setInputFiles(file);
    await page.getByRole("button", { name: "Preview import" }).click();
    await expect(page.getByText("Preview only: nothing has been saved yet")).toBeVisible();
    await expect(page.getByText("1 new category")).toBeVisible();
    await expect(page.getByText("Line 5: Missing category.")).toBeVisible();
    await page.getByRole("button", { name: "Import 2 products and 3 sizes" }).click();
    await expect(page.getByText("Import finished")).toBeVisible();

    const rows = await sql<{ name: string; size_label: string; cost_pence: number | null }>(
      `select p.name, v.size_label, v.cost_pence from public.products p join public.product_variants v on v.product_id = p.id
        join public.categories c on c.id = p.category_id where c.name = $1 order by p.name, v.size_sort`,
      [`E2E Imports ${stamp}`],
    );
    expect(rows).toEqual([
      { name: "E2E Chakki Atta", size_label: "10 kg", cost_pence: null },
      { name: "E2E Chakki Atta", size_label: "25 kg", cost_pence: null },
      { name: "E2E Rose Syrup", size_label: "750 ml × 12", cost_pence: null },
    ]);

    await page.goto("/admin/products/import");
    await page.locator('input[type="file"]').setInputFiles(file);
    await page.getByRole("button", { name: "Preview import" }).click();
    await expect(page.getByText("Nothing new to import")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Import \d+ products/ })).toHaveCount(0);

    await page.goto(`/admin/products?status=needs-price&q=E2E+Chakki`);
    await expect(page.getByRole("link", { name: "E2E Chakki Atta" })).toBeVisible();
  });

  test("the missing price/photo list downloads for admins only", async ({ page, browser }) => {
    await signIn(page, "admin@example.com");
    const res = await page.request.get("/admin/products/missing.csv");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    const body = await res.text();
    expect(body.split("\r\n")[0]).toBe("category,product,sizes,sizes_missing_price,has_photo,visible,supplier");
    expect(body).toContain("Basant Basmati Rice");

    const ctx = await browser.newContext();
    const customer = await ctx.newPage();
    await signIn(customer, "restaurant.a@example.com");
    expect((await customer.request.get("/admin/products/missing.csv")).status()).toBe(403);
    const r = await customer.goto("/admin/products");
    expect(r?.status()).toBe(403);
    await ctx.close();
  });
});
