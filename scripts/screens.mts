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
  { name: "account", path: "/account", as: "restaurant.a@example.com" },
  { name: "basket-soon", path: "/basket", as: "restaurant.a@example.com" },
  { name: "forbidden", path: "/admin", as: "restaurant.a@example.com" },
  { name: "admin", path: "/admin", as: "admin@example.com" },
  { name: "admin-users", path: "/admin/users", as: "admin@example.com" },
  { name: "admin-soon", path: "/admin/orders", as: "admin@example.com" },
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
  { name: "account-disabled", path: "/account-disabled" },
];

// Local test stack only: start with fresh rate-limit counters (many sign-ins from 127.0.0.1).
const db = new Client({ connectionString: process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
await db.connect();
await db.query("truncate public.rate_limits");
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
