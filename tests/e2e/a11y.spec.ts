import { randomBytes } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn, sql } from "./helpers";

/**
 * Automated accessibility check (axe-core, WCAG 2.1 A/AA rules) on every main screen, as each
 * role, on a phone and on a desktop. Automated rules catch roughly a third of real issues; the
 * rest (focus order, wording) was checked by hand while building each screen.
 */
type Screen = { path: string; as?: string };

async function ids() {
  const [o] = await sql<{ id: string; inv: string }>("select o.id, i.id inv from orders o join invoices i on i.order_id = o.id where o.number = 1001");
  const [so] = await sql<{ id: string }>("select id from supplier_orders where supplier_id = '00000000-0000-4000-a000-000000000001' order by created_at limit 1");
  // A driver link for an open delivery (only the hash is stored, as always).
  const [open] = await sql<{ id: string }>("select id from supplier_orders where status in ('placed', 'sent') order by created_at desc limit 1");
  const token = randomBytes(32).toString("base64url");
  await sql("select public.create_driver_link($1, extensions.digest($2, 'sha256'), now() + interval '1 hour', null)", [open.id, token]);
  return { order: o.id, supplierOrder: so.id, driver: `/d/${token}` };
}

async function scan(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return result.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test.describe(`accessibility at ${viewport.width}px`, () => {
    test.use({ viewport });

    test("public, restaurant, supplier and admin screens have no WCAG A/AA violations", async ({ page, browser }) => {
      test.setTimeout(240_000);
      const { order, supplierOrder, driver } = await ids();
      const screens: Screen[] = [
        { path: "/" },
        { path: "/catalogue" },
        { path: "/catalogue/basant-basmati-rice" },
        { path: "/login" },
        { path: "/register" },
        { path: "/forgot-password" },
        { path: driver },
        { path: "/shop", as: "restaurant.a@example.com" },
        { path: "/shop/p/basant-basmati-rice", as: "restaurant.a@example.com" },
        { path: "/basket", as: "restaurant.a@example.com" },
        { path: "/orders", as: "restaurant.a@example.com" },
        { path: `/orders/${order}`, as: "restaurant.a@example.com" },
        { path: "/invoices", as: "restaurant.a@example.com" },
        { path: "/account", as: "restaurant.a@example.com" },
        { path: "/supplier", as: "supplier.a@example.com" },
        { path: `/supplier/orders/${supplierOrder}`, as: "supplier.a@example.com" },
        { path: "/admin", as: "admin@example.com" },
        { path: "/admin/orders", as: "admin@example.com" },
        { path: `/admin/orders/${order}`, as: "admin@example.com" },
        { path: "/admin/payments", as: "admin@example.com" },
        { path: "/admin/suppliers", as: "admin@example.com" },
        { path: "/admin/suppliers/00000000-0000-4000-a000-000000000001", as: "admin@example.com" },
        { path: "/admin/invoices", as: "admin@example.com" },
        { path: "/admin/audit", as: "admin@example.com" },
        { path: "/admin/approvals", as: "admin@example.com" },
        { path: "/admin/customers", as: "admin@example.com" },
        { path: "/admin/customers/20000000-0000-4000-a000-000000000001", as: "admin@example.com" },
        { path: "/admin/customers/20000000-0000-4000-a000-000000000001/pricing", as: "admin@example.com" },
        { path: "/admin/products", as: "admin@example.com" },
        { path: "/admin/products/40000000-0000-4000-a000-000000000001", as: "admin@example.com" },
        { path: "/admin/categories", as: "admin@example.com" },
        { path: "/admin/settings", as: "admin@example.com" },
        { path: "/admin/users", as: "admin@example.com" },
      ];
      const problems: string[] = [];
      let current: string | undefined;
      let ctx = await browser.newContext({ viewport });
      let p = await ctx.newPage();
      for (const s of screens) {
        if (s.as !== current) {
          await ctx.close();
          ctx = await browser.newContext({ viewport });
          p = await ctx.newPage();
          if (s.as) await signIn(p, s.as);
          current = s.as;
        }
        for (const v of await scan(p, s.path)) problems.push(`${s.path}: ${v}`);
      }
      await ctx.close();
      void page;
      expect(problems, problems.join("\n")).toEqual([]);
    });
  });
}
