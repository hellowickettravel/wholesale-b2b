/**
 * Live smoke test (writes data!). Drives the real screens of a deployed site through the restaurant half of the journey.
 * Only run against a site whose database you are willing to write throw-away "ZZ Smoke" rows into, and clean up after.
 *
 *   BASE=https://www.wholesalestreet.co.uk OUT=/tmp/smoke STAGE=register npx tsx scripts/smoke-live.mts
 *
 * Credentials come from the environment (ADMIN_EMAIL, ADMIN_PASSWORD, RESTAURANT_EMAIL, RESTAURANT_PASSWORD, ...).
 */
import { mkdirSync } from "node:fs";
import { chromium, expect, type Browser, type Page } from "@playwright/test";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = process.env.OUT ?? "test-results/smoke";
const STAGE = process.env.STAGE ?? "register";
const executablePath = process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} not set`);
  return v;
};
mkdirSync(OUT, { recursive: true });
expect.configure({ timeout: 30_000 }); // a deployed site is slower than localhost; server actions take a few seconds

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByLabel("Email").fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
}


async function sign(page: Page) {
  const pad = page.getByRole("img", { name: /Customer signature/ });
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 100);
  await page.mouse.down();
  for (const [dx, dy] of [[60, -40], [120, 20], [180, -30], [240, 10]]) await page.mouse.move(box.x + 30 + dx, box.y + 100 + dy, { steps: 4 });
  await page.mouse.up();
}

const results: string[] = [];
async function step<T>(page: Page, name: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  try {
    const r = await fn();
    results.push(`PASS ${name} (${Date.now() - t0} ms)`);
    console.log(results.at(-1));
    return r;
  } catch (e) {
    results.push(`FAIL ${name}: ${(e as Error).message.split("\n")[0]}`);
    console.log(results.at(-1));
    await page.screenshot({ path: `${OUT}/FAIL-${name.replace(/[^a-z0-9]+/gi, "_")}.png`, fullPage: true }).catch(() => {});
    throw e;
  }
}

async function flow(browser: Browser) {
  const fresh = async (opts: Parameters<Browser["newContext"]>[0] = {}) => {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", ...opts });
    const pg = await c.newPage();
    pg.setDefaultTimeout(30_000);
    return pg;
  };
  const name = env("RESTAURANT_NAME");
  const email = env("RESTAURANT_EMAIL");
  const rpw = env("RESTAURANT_PASSWORD");
  const spw = env("SUPPLIER_PASSWORD");
  const admin = await fresh();
  await step(admin, "admin signs in", () => login(admin, env("ADMIN_EMAIL"), env("ADMIN_PASSWORD")));

  const RESUME = process.env.RESUME_ORDER;
  const shop = await fresh();
  let orderId = RESUME ?? "";
  if (RESUME) {
    await step(shop, "restaurant signs in (resume)", () => login(shop, email, rpw));
  } else {
  await step(admin, "admin adds a restaurant with a password", async () => {
    await admin.goto(`${BASE}/admin/customers/new`, { waitUntil: "load" });
    await admin.waitForLoadState("networkidle").catch(() => {});
    await admin.getByLabel("Restaurant or business name").fill(name);
    await admin.getByLabel("Contact name").fill("Smoke Tester");
    await admin.getByLabel("Phone").fill("07700 900999");
    await admin.locator('input[name="email"]').fill(email);
    await admin.getByLabel("Address", { exact: true }).fill("1 Smoke Street");
    await admin.getByLabel("Town or city").fill("London");
    await admin.getByLabel("Postcode").fill("E1 6AN");
    await admin.locator('input[name="login"][value="password"]').check();
    await admin.locator('input[name="password"]').fill(rpw);
    await admin.getByRole("button", { name: "Add restaurant" }).click();
    await admin.waitForURL(/\/admin\/customers\/[0-9a-f-]{36}/, { timeout: 30_000 });
  });
  const customerId = /customers\/([0-9a-f-]{36})/.exec(admin.url())![1];
  console.log("customer", customerId, new URL(admin.url()).search);
  await admin.screenshot({ path: `${OUT}/01-customer-created.png`, fullPage: true });

  await step(shop, "restaurant signs in and lands in the shop", async () => {
    await login(shop, email, rpw);
    await expect(shop).toHaveURL(/\/shop/);
  });
  await shop.screenshot({ path: `${OUT}/02-shop-home.png`, fullPage: true });

  await step(shop, "restaurant adds rice and cola to the basket", async () => {
    await shop.goto(`${BASE}/shop/p/zz-smoke-test-rice`, { waitUntil: "load" });
    await shop.waitForLoadState("networkidle").catch(() => {});
    await shop.screenshot({ path: `${OUT}/03-product.png`, fullPage: true });
    await shop.getByRole("textbox", { name: /Quantity of ZZ Smoke Test Rice/ }).fill("2");
    await shop.getByRole("button", { name: /Add ZZ Smoke Test Rice .* to basket/ }).click();
    await expect(shop.getByText(/Added 2 × ZZ Smoke Test Rice/)).toBeVisible();
    await shop.goto(`${BASE}/shop/p/zz-smoke-test-cola`, { waitUntil: "load" });
    await shop.waitForLoadState("networkidle").catch(() => {});
    await shop.getByRole("textbox", { name: /Quantity of ZZ Smoke Test Cola/ }).fill("3");
    await shop.getByRole("button", { name: /Add ZZ Smoke Test Cola .* to basket/ }).click();
    await expect(shop.getByText(/Added 3 × ZZ Smoke Test Cola/)).toBeVisible();
  });

  const total = await step(shop, "basket totals and place order", async () => {
    await shop.goto(`${BASE}/basket`, { waitUntil: "load" });
    await shop.waitForLoadState("networkidle").catch(() => {});
    const t = await shop.getByTestId("basket-total").textContent();
    await shop.screenshot({ path: `${OUT}/04-basket.png`, fullPage: true });
    await shop.getByRole("button", { name: /^Place order/ }).click();
    await shop.waitForURL(/\/orders\/[0-9a-f-]{36}\/confirmed$/, { timeout: 45_000 });
    return t;
  });
  console.log("basket total", total);
  await shop.screenshot({ path: `${OUT}/05-order-confirmed.png`, fullPage: true });
  orderId = /\/orders\/([0-9a-f-]{36})\//.exec(shop.url())![1];
  console.log("order", orderId);

  }
  await step(admin, "admin sees the order and both supplier parts", async () => {
    await admin.goto(`${BASE}/admin/orders/${orderId}`, { waitUntil: "load" });
    await expect(admin.getByTestId("part-ZZ Smoke Supplier A")).toBeVisible();
    await expect(admin.getByTestId("part-ZZ Smoke Supplier B")).toBeVisible();
    await admin.screenshot({ path: `${OUT}/06-admin-order.png`, fullPage: true });
  });
  const head = (await admin.getByRole("heading", { level: 1 }).first().textContent()) ?? "";
  console.log("order heading", head);

  // supplier ids for the order URLs
  const supA = await fresh();
  await step(supA, "supplier A signs in", () => login(supA, "smoke-a@example.com", spw));
  await step(supA, "supplier A accepts and makes a driver link", async () => {
    await supA.goto(`${BASE}/supplier`, { waitUntil: "load" });
    await supA.screenshot({ path: `${OUT}/07-supplier-a-orders.png`, fullPage: true });
    await supA.locator('a[href^="/supplier/orders/"]').first().click();
    await supA.waitForURL(/\/supplier\/orders\/[0-9a-f-]{36}/);
    await supA.getByRole("button", { name: "Accept order" }).click();
    await expect(supA.getByText("With the supplier").first()).toBeVisible();
    await supA.getByRole("button", { name: "Make driver link" }).click();
    await expect(supA.getByTestId("driver-link")).toBeVisible();
    await supA.screenshot({ path: `${OUT}/08-supplier-a-driver-link.png`, fullPage: true });
  });
  const link = new URL((await supA.getByTestId("driver-link").textContent())!).pathname;
  const phone = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await step(phone, "driver submits proof from a phone", async () => {
    await phone.goto(`${BASE}${link}`, { waitUntil: "load" });
    await phone.waitForLoadState("networkidle").catch(() => {});
    await phone.screenshot({ path: `${OUT}/09-driver-page.png`, fullPage: true });
    await phone.locator("#proof-photo").setInputFiles("tests/fixtures/delivery-photo.jpg");
    await expect(phone.getByRole("img", { name: "Delivery photo preview" })).toBeVisible();
    await sign(phone);
    await phone.getByRole("button", { name: "Submit proof of delivery" }).click();
    await expect(phone.getByRole("heading", { name: "Delivery recorded" })).toBeVisible();
    await phone.screenshot({ path: `${OUT}/10-driver-done.png`, fullPage: true });
  });

  const supB = await fresh();
  await step(supB, "supplier B uploads its own proof", async () => {
    await login(supB, "smoke-b@example.com", spw);
    await supB.goto(`${BASE}/supplier`, { waitUntil: "load" });
    await supB.locator('a[href^="/supplier/orders/"]').first().click();
    await supB.waitForURL(/\/supplier\/orders\/[0-9a-f-]{36}/);
    await supB.getByText("Upload the proof yourself").click();
    await supB.locator("#proof-photo").setInputFiles("tests/fixtures/delivery-photo.jpg");
    await supB.locator("#proof-document").setInputFiles("tests/fixtures/signed-note.pdf");
    await supB.getByRole("button", { name: "Save proof and mark delivered" }).click();
    await expect(supB.getByRole("heading", { name: "Proof of delivery" })).toBeVisible();
  });

  await step(shop, "restaurant sees both proofs", async () => {
    await shop.goto(`${BASE}/orders/${orderId}`, { waitUntil: "load" });
    await expect(shop.getByRole("heading", { name: "Proof of delivery" })).toHaveCount(2);
    await shop.screenshot({ path: `${OUT}/11-restaurant-order.png`, fullPage: true });
  });

  await step(admin, "admin records the payment, pays suppliers, completes", async () => {
    await admin.goto(`${BASE}/admin/orders/${orderId}`, { waitUntil: "load" });
    await admin.screenshot({ path: `${OUT}/12-admin-order-delivered.png`, fullPage: true });
    const pay = admin.locator("form:has(input[name='refund'])");
    console.log("payment amount prefilled:", await pay.locator("input[name='amount']").inputValue());
    await pay.locator("input[name='reference']").fill("SMOKE-TEST");
    await pay.getByRole("button", { name: "Record payment" }).click();
    await expect(admin.getByText("Payment recorded.")).toBeVisible();
    for (const supplier of ["ZZ Smoke Supplier A", "ZZ Smoke Supplier B"]) {
      const part = admin.getByTestId(`part-${supplier}`);
      await part.getByText(`Record a payment to ${supplier}`).click();
      await part.getByRole("button", { name: "Record supplier payment" }).click();
      await expect(part.getByRole("button", { name: "Mark not paid" })).toBeVisible();
    }
    await admin.getByRole("button", { name: "Mark completed" }).click();
    await expect(admin.getByText("Order marked completed.")).toBeVisible();
  });

  await step(shop, "restaurant downloads its invoice PDF", async () => {
    await shop.goto(`${BASE}/invoices`, { waitUntil: "load" });
    const pdfLink = shop.getByRole("link", { name: /^PDF of INV-/ }).first();
    const href = (await pdfLink.getAttribute("href"))!;
    const res = await shop.request.get(href.startsWith("/") ? BASE + href : href);
    expect(res.status()).toBe(200);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(`${OUT}/invoice.pdf`, await res.body());
    console.log("invoice pdf bytes", (await res.body()).length, href);
  });
  console.log("\n" + results.join("\n"));
}

async function main() {
  const browser = await chromium.launch({ executablePath });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20_000);
  try {
    if (STAGE === "register") {
      await page.goto(`${BASE}/register`, { waitUntil: "load" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.getByLabel("Restaurant or business name").fill(env("RESTAURANT_NAME"));
      await page.getByLabel("Your name").fill("Smoke Tester");
      await page.getByLabel("Phone").fill("07700 900999");
      await page.getByLabel("Address line 1").fill("1 Smoke Street");
      await page.getByLabel("Town or city").fill("London");
      await page.getByLabel("Postcode").fill("E1 6AN");
      await page.getByLabel("Email").fill(env("RESTAURANT_EMAIL"));
      await page.locator('input[name="password"]').fill(env("RESTAURANT_PASSWORD"));
      await page.locator('input[name="confirm_password"]').fill(env("RESTAURANT_PASSWORD"));
      await page.getByRole("button", { name: "Create trade account" }).click();
      await page.waitForURL(/\/register\/pending$|\/register/, { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(3000);
      console.log("after submit →", new URL(page.url()).pathname);
      console.log("alerts:", await page.locator("main [role=alert]").allInnerTexts());
      await page.screenshot({ path: `${OUT}/register-result.png`, fullPage: true });
    }
    if (STAGE === "flow") await flow(browser);
    if (STAGE === "finish") {
      const orderId = env("RESUME_ORDER");
      await login(page, env("ADMIN_EMAIL"), env("ADMIN_PASSWORD"));
      await step(page, "admin pays both suppliers and completes", async () => {
        await page.goto(`${BASE}/admin/orders/${orderId}`, { waitUntil: "load" });
        for (const supplier of ["ZZ Smoke Supplier A", "ZZ Smoke Supplier B"]) {
          const part = page.getByTestId(`part-${supplier}`);
          if (await part.getByRole("button", { name: "Mark not paid" }).count()) continue;
          await part.getByText(`Record a payment to ${supplier}`).click();
          await part.getByRole("button", { name: "Record supplier payment" }).click();
          await expect(part.getByRole("button", { name: "Mark not paid" })).toBeVisible();
        }
        if (await page.getByRole("button", { name: "Mark completed" }).count()) {
          await page.getByRole("button", { name: "Mark completed" }).click();
          await expect(page.getByText("Order marked completed.").first()).toBeVisible();
        }
      });
      await page.screenshot({ path: `${OUT}/13-admin-completed.png`, fullPage: true });
      const shop = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      shop.setDefaultTimeout(30_000);
      await login(shop, env("RESTAURANT_EMAIL"), env("RESTAURANT_PASSWORD"));
      await step(shop, "restaurant downloads its invoice PDF", async () => {
        await shop.goto(`${BASE}/invoices`, { waitUntil: "load" });
        await shop.screenshot({ path: `${OUT}/14-restaurant-invoices.png`, fullPage: true });
        const href = (await shop.getByRole("link", { name: /^PDF of INV-/ }).first().getAttribute("href"))!;
        const r = await shop.evaluate(async (u) => {
          const res = await fetch(u);
          const buf = new Uint8Array(await res.arrayBuffer());
          let bin = "";
          for (const b of buf) bin += String.fromCharCode(b);
          return { status: res.status, type: res.headers.get("content-type"), b64: btoa(bin) };
        }, href);
        expect(r.status).toBe(200);
        expect(r.type).toContain("pdf");
        const { writeFileSync } = await import("node:fs");
        const body = Buffer.from(r.b64, "base64");
        writeFileSync(`${OUT}/invoice.pdf`, body);
        console.log("invoice pdf bytes", body.length, href);
      });
    }
    if (STAGE === "costs-live") {
      // Uploads a one-row cost file for the throw-away "ZZ Smoke" rice size, applies it, and prints the preview text.
      await login(page, env("ADMIN_EMAIL"), env("ADMIN_PASSWORD"));
      await page.goto(`${BASE}/admin/products/costs`, { waitUntil: "load" });
      await page.waitForLoadState("networkidle").catch(() => {});
      const csv = `variant_id,cost\n${env("VARIANT_ID")},${env("NEW_COST")}\n`;
      await page.locator('input[type="file"]').setInputFiles({ name: "costs.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
      await page.getByRole("button", { name: "Preview changes" }).click();
      await page.getByText("Preview only: nothing has been saved yet").waitFor({ timeout: 30_000 });
      console.log("preview:", (await page.locator("section[aria-label='Import report']").innerText()).replace(/\s+/g, " ").slice(0, 300));
      await page.screenshot({ path: `${OUT}/costs-preview.png`, fullPage: true });
      await page.getByRole("button", { name: /^Apply 1 change/ }).click();
      await page.getByText("Costs saved").waitFor({ timeout: 30_000 });
      console.log("applied");
    }
    if (STAGE === "bust-cache") {
      // Saving a category (no change) clears the 1-hour catalogue cache, so rows written straight to the database show up.
      await login(page, env("ADMIN_EMAIL"), env("ADMIN_PASSWORD"));
      await page.goto(`${BASE}/admin/categories`, { waitUntil: "load" });
      await page.getByRole("link", { name: /Rice/ }).first().click();
      await page.getByRole("button", { name: "Save changes" }).click();
      await page.waitForTimeout(4000);
      console.log("saved; url", new URL(page.url()).pathname);
    }
  } finally {
    await browser.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
