/**
 * Screenshots of key screens at phone (390) and desktop (1280) widths, plus a horizontal
 * overflow check. Needs the app on :3000 and the seeded local stack.
 *   npx tsx scripts/screens.mts [filter]
 * Output: test-results/screens/<name>-<width>.png
 */
import { mkdirSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";
import { Client } from "pg";

const BASE = "http://localhost:3000";
const OUT = "test-results/screens";
const filter = process.argv[2];

type Shot = { name: string; path: string; as?: string; before?: (p: Page) => Promise<void> };

const shots: Shot[] = [
  { name: "home", path: "/" },
  { name: "catalogue", path: "/catalogue" },
  { name: "catalogue-category", path: "/catalogue?category=drinks" },
  { name: "catalogue-search", path: "/catalogue?q=basmati" },
  { name: "catalogue-empty", path: "/catalogue?q=zzzz" },
  { name: "catalogue-page2", path: "/catalogue?page=2" },
  { name: "product", path: "/catalogue/basant-basmati-rice" },
  { name: "product-single", path: "/catalogue/rose-water" },
  { name: "login", path: "/login" },
  {
    name: "login-error",
    path: "/login",
    before: async (p) => {
      await p.getByLabel("Email").fill("restaurant.a@example.com");
      await p.locator('input[name="password"]').fill("wrong-pass-1");
      await p.getByRole("button", { name: "Sign in" }).click();
      await p.locator("main").getByRole("alert").waitFor();
    },
  },
  { name: "login-notice", path: "/login?notice=link-expired" },
  { name: "register", path: "/register" },
  {
    name: "register-errors",
    path: "/register",
    before: async (p) => {
      await p.getByRole("button", { name: "Create trade account" }).click();
      await p.getByText("Enter a valid UK postcode").waitFor();
    },
  },
  { name: "pending-anon", path: "/register/pending" },
  { name: "pending-signed-in", path: "/register/pending", as: "pending@example.com" },
  { name: "forgot", path: "/forgot-password" },
  {
    name: "forgot-sent",
    path: "/forgot-password",
    before: async (p) => {
      await p.getByLabel("Email").fill("someone@example.com");
      await p.getByRole("button", { name: "Send reset link" }).click();
      await p.getByText("Check your email").waitFor();
    },
  },
  { name: "reset-expired", path: "/reset-password" },
  { name: "reset-form", path: "/reset-password", as: "restaurant.b@example.com" },
  { name: "invite-form", path: "/auth/invite", as: "supplier.b@example.com" },
  { name: "shop", path: "/shop", as: "restaurant.a@example.com" },
  { name: "shop-search", path: "/shop?q=rice", as: "restaurant.a@example.com" },
  { name: "shop-category", path: "/shop?category=drinks", as: "restaurant.a@example.com" },
  { name: "shop-empty-search", path: "/shop?q=zzzz", as: "restaurant.a@example.com" },
  { name: "shop-product", path: "/shop/p/basant-basmati-rice", as: "restaurant.a@example.com" },
  { name: "shop-product-unpriced", path: "/shop/p/green-cardamom", as: "restaurant.a@example.com" },
  { name: "basket", path: "/basket", as: "restaurant.a@example.com" },
  { name: "basket-problem", path: "/basket", as: "restaurant.b@example.com" },
  { name: "orders", path: "/orders", as: "restaurant.a@example.com" },
  { name: "order", path: "/orders/{latestA}", as: "restaurant.a@example.com" },
  { name: "order-confirmed", path: "/orders/{latestA}/confirmed", as: "restaurant.a@example.com" },
  { name: "account", path: "/account", as: "restaurant.a@example.com" },
  { name: "forbidden", path: "/admin", as: "restaurant.a@example.com" },
  { name: "admin", path: "/admin", as: "admin@example.com" },
  { name: "admin-users", path: "/admin/users", as: "admin@example.com" },
  { name: "admin-invoices", path: "/admin/invoices", as: "admin@example.com" },
  { name: "invoices", path: "/invoices", as: "restaurant.a@example.com" },
  { name: "admin-orders", path: "/admin/orders", as: "admin@example.com" },
  { name: "admin-orders-filtered", path: "/admin/orders?status=open&payment=unpaid", as: "admin@example.com" },
  { name: "admin-order", path: "/admin/orders/{order1002}", as: "admin@example.com" },
  { name: "admin-order-delivered", path: "/admin/orders/{deliveredOrderA}", as: "admin@example.com" },
  { name: "admin-payments", path: "/admin/payments", as: "admin@example.com" },
  { name: "admin-payments-suppliers", path: "/admin/payments?tab=suppliers", as: "admin@example.com" },
  { name: "admin-suppliers", path: "/admin/suppliers", as: "admin@example.com" },
  { name: "admin-supplier", path: "/admin/suppliers/00000000-0000-4000-a000-000000000001", as: "admin@example.com" },
  { name: "admin-supplier-new", path: "/admin/suppliers/new", as: "admin@example.com" },
  { name: "admin-audit", path: "/admin/audit", as: "admin@example.com" },
  { name: "admin-approvals", path: "/admin/approvals", as: "admin@example.com" },
  { name: "admin-customers", path: "/admin/customers", as: "admin@example.com" },
  { name: "admin-customer-new", path: "/admin/customers/new", as: "admin@example.com" },
  { name: "admin-customer", path: "/admin/customers/20000000-0000-4000-a000-000000000001", as: "admin@example.com" },
  { name: "admin-customer-pending", path: "/admin/customers/20000000-0000-4000-a000-000000000003", as: "admin@example.com" },
  { name: "admin-pricing", path: "/admin/customers/20000000-0000-4000-a000-000000000001/pricing", as: "admin@example.com" },
  {
    name: "admin-pricing-dirty",
    path: "/admin/customers/20000000-0000-4000-a000-000000000001/pricing",
    as: "admin@example.com",
    before: async (p) => {
      await p.getByLabel("Rice margin per cent").fill("12.5");
      await p.getByText(/unsaved change/).waitFor();
    },
  },
  { name: "admin-settings", path: "/admin/settings", as: "admin@example.com" },
  { name: "admin-products", path: "/admin/products", as: "admin@example.com" },
  { name: "admin-products-needs-price", path: "/admin/products?status=needs-price&q=rice", as: "admin@example.com" },
  { name: "admin-product-edit", path: "/admin/products/40000000-0000-4000-a000-000000000001", as: "admin@example.com" },
  { name: "admin-product-new", path: "/admin/products/new", as: "admin@example.com" },
  { name: "admin-categories", path: "/admin/categories", as: "admin@example.com" },
  { name: "admin-category-edit", path: "/admin/categories/ca7e0000-0000-4000-a000-000000000001", as: "admin@example.com" },
  { name: "admin-import", path: "/admin/products/import", as: "admin@example.com" },
  {
    name: "admin-import-preview",
    path: "/admin/products/import",
    as: "admin@example.com",
    before: async (p) => {
      await p.locator('input[type="file"]').setInputFiles("tests/fixtures/catalogue-sample.csv");
      await p.getByRole("button", { name: "Preview import" }).click();
      await p.getByText(/Nothing new to import|Preview only/).waitFor();
    },
  },
  { name: "supplier", path: "/supplier", as: "supplier.a@example.com" },
  { name: "supplier-all", path: "/supplier?show=all", as: "supplier.a@example.com" },
  { name: "supplier-order", path: "/supplier/orders/{openSoA}", as: "supplier.a@example.com" },
  {
    name: "supplier-order-link",
    path: "/supplier/orders/{openSoA2}",
    as: "supplier.a@example.com",
    before: async (p) => {
      p.once("dialog", (d) => d.accept());
      await p.getByRole("button", { name: /^Make (driver|a new) link$/ }).click();
      await p.getByTestId("driver-link").waitFor();
    },
  },
  { name: "supplier-order-proof", path: "/supplier/orders/{deliveredSoA}", as: "supplier.a@example.com" },
  { name: "driver", path: "/d/{driverToken}" },
  {
    name: "driver-filled",
    path: "/d/{driverToken}",
    before: async (p) => {
      await p.locator("#proof-photo").setInputFiles("tests/fixtures/delivery-photo.jpg");
      await p.getByRole("img", { name: "Delivery photo preview" }).waitFor();
      const pad = p.getByRole("img", { name: /Customer signature/ });
      await pad.scrollIntoViewIfNeeded();
      const b = (await pad.boundingBox())!;
      await p.mouse.move(b.x + 40, b.y + 110);
      await p.mouse.down();
      for (const [dx, dy] of [[50, -50], [110, 10], [170, -40], [230, 0]]) await p.mouse.move(b.x + 40 + dx, b.y + 110 + dy, { steps: 5 });
      await p.mouse.up();
      await p.getByLabel(/Name of the person signing/).fill("Priya");
    },
  },
  { name: "driver-invalid", path: "/d/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
  { name: "order-proof", path: "/orders/{deliveredOrderA}", as: "restaurant.a@example.com" },
  { name: "account-disabled", path: "/account-disabled" },
];

// Local test stack only: start with fresh rate-limit counters (many sign-ins from 127.0.0.1).
const db = new Client({ connectionString: process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
await db.connect();
await db.query("truncate public.rate_limits");
// Leftovers from E2E runs would show up on the public pages.
await db.query("delete from public.products where name like 'E2E %' or category_id in (select id from public.categories where name like 'E2E %')");
await db.query("delete from public.categories where name like 'E2E %'");
// Baskets to photograph: A has a normal basket under the free-delivery minimum; B has an item
// that is not on its list.
await db.query("truncate public.basket_items");
await db.query(`insert into public.basket_items (customer_id, variant_id, qty) values
  ('20000000-0000-4000-a000-000000000001', '50000000-0000-4000-a000-000000000002', 2),
  ('20000000-0000-4000-a000-000000000001', '50000000-0000-4000-a000-000000000001', 1),
  ('20000000-0000-4000-a000-000000000001', '50000000-0000-4000-a000-000000000003', 3),
  ('20000000-0000-4000-a000-000000000002', '50000000-0000-4000-a000-000000000001', 4),
  ('20000000-0000-4000-a000-000000000002', '50000000-0000-4000-a000-000000000004', 1)`);
const { rows: latest } = await db.query<{ id: string }>(
  "select id from public.orders where customer_id = '20000000-0000-4000-a000-000000000001' order by created_at desc limit 1",
);
// Delivery screens: open supplier-A orders, a delivered one with a proof, and a driver link
// with a known token (only its hash is stored, as always).
const { rows: openA } = await db.query<{ id: string }>(
  "select so.id from public.supplier_orders so where so.supplier_id = '00000000-0000-4000-a000-000000000001' and so.status = 'placed' order by so.created_at desc limit 3",
);
const { rows: proofA } = await db.query<{ so: string; order_id: string }>(
  `select so.id so, so.order_id from public.supplier_orders so join public.delivery_proofs dp on dp.supplier_order_id = so.id
    join public.orders o on o.id = so.order_id
   where so.supplier_id = '00000000-0000-4000-a000-000000000001' and dp.submitted_by_kind = 'driver' and o.status = 'delivered'
   order by dp.submitted_at desc limit 1`,
);
const driverToken = "ScreenshotsDriverToken000000000000000000000";
const { rowCount: reused } = await db.query(
  "update public.delivery_proofs set revoked_at = null, expires_at = now() + interval '72 hours' where token_hash = extensions.digest($1, 'sha256') and submitted_at is null",
  [driverToken],
);
if (!reused && openA[2]) {
  await db.query(
    "select public.create_driver_link($1, extensions.digest($2, 'sha256'), now() + interval '72 hours', null)",
    [openA[2].id, driverToken],
  );
}
// Payments screens: seed order 1002 is overdue and due a chase today.
await db.query("update public.orders set promised_pay_date = current_date - 2, next_chase_date = current_date where number = 1002 and status <> 'cancelled'");
const { rows: o1002 } = await db.query<{ id: string }>("select id from public.orders where number = 1002");
const vars: Record<string, string> = {
  order1002: o1002[0]?.id ?? "none",
  latestA: latest[0]?.id ?? "none",
  openSoA: openA[0]?.id ?? "none",
  openSoA2: openA[1]?.id ?? "none",
  deliveredSoA: proofA[0]?.so ?? "none",
  deliveredOrderA: proofA[0]?.order_id ?? "none",
  driverToken,
};
for (const s of shots) s.path = s.path.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "none");
await db.end();

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
mkdirSync(OUT, { recursive: true });
const problems: string[] = [];

for (const width of [390, 1280]) {
  const sessions = new Map<string, Awaited<ReturnType<typeof browser.newContext>>>();
  const contextFor = async (as?: string) => {
    const key = as ?? "anon";
    if (!sessions.has(key)) {
      const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 }, deviceScaleFactor: 1 });
      if (as) {
        const p = await ctx.newPage();
        await p.goto(`${BASE}/login`, { waitUntil: "load" });
        await p.getByLabel("Email").fill(as);
        await p.locator('input[name="password"]').fill("Password123!");
        await p.getByRole("button", { name: "Sign in" }).click();
        await p.waitForURL((u) => !u.pathname.startsWith("/login"));
        await p.close();
      }
      sessions.set(key, ctx);
    }
    return sessions.get(key)!;
  };
  for (const shot of shots) {
    if (filter && !shot.name.includes(filter)) continue;
    const ctx = shot.before && !shot.as ? await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 } }) : await contextFor(shot.as);
    const page = await ctx.newPage();
    await page.goto(`${BASE}${shot.path}`, { waitUntil: "load" });
    if (shot.before) await shot.before(page);
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) problems.push(`${shot.name}@${width}: horizontal overflow ${overflow}px`);
    await page.screenshot({ path: `${OUT}/${shot.name}-${width}.png`, fullPage: true });
    // Also the first screen on phones: long pages are unreadable when scaled down for review.
    if (width === 390) await page.screenshot({ path: `${OUT}/${shot.name}-${width}-fold.png` });
    await page.close();
    if (shot.before && !shot.as) await ctx.close();
  }
  for (const ctx of sessions.values()) await ctx.close();
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "no horizontal overflow");
