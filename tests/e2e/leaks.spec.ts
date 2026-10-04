import { randomBytes } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { signIn, sql } from "./helpers";

/**
 * What each role's browser receives: the HTML and the RSC payload (the data React streams to the
 * page, which can carry fields the screen never shows) of every page, scanned for secrets.
 * Costs in the seed: rice 20 kg £42.00, mango £14.50. Seed admin notes start "ADMIN NOTE".
 */
async function scan(request: APIRequestContext, path: string, words: string[], mustShow?: string) {
  for (const rsc of [false, true]) {
    const res = await request.get(path, { headers: rsc ? { RSC: "1" } : {} });
    expect(res.status(), path).toBe(200);
    const body = await res.text();
    // Positive control: the page carries what it is meant to show, so a pass is not an empty page.
    if (mustShow) expect(body.includes(mustShow), `${path}${rsc ? " (RSC)" : ""} lacks ${mustShow}`).toBe(true);
    for (const w of words) expect(body.includes(w), `${path}${rsc ? " (RSC)" : ""} contains ${w}`).toBe(false);
  }
}

const SECRET_FIELDS = ["cost_pence", "costPence", "unitCost", "margin_bp", "marginBp", "admin_notes", "ADMIN NOTE", "payment_notes", "next_chase_date", "token_hash", "service_role"];

test.describe("nothing secret reaches a browser", () => {
  test("restaurant: orders, an order with its proof, invoices and account", async ({ page }) => {
    const [o] = await sql<{ id: string }>("select id from orders where number = 1001");
    await signIn(page, "restaurant.a@example.com");
    // Supplier identity, costs and restaurant B's details never reach restaurant A.
    const words = [...SECRET_FIELDS, "supplier_id", "supplierId", "Dev Supplier", "£42.00", "£14.50", "Dev Restaurant B", "restaurant.b@example.com"];
    for (const path of ["/orders", `/orders/${o.id}`, `/orders/${o.id}/confirmed`, "/invoices"]) await scan(page.request, path, words, "ORDER-1001");
    await scan(page.request, "/account", words, "Dev Restaurant A");
  });

  test("supplier: its order list and an order: no prices, no other supplier, no admin notes", async ({ page }) => {
    const [so] = await sql<{ id: string }>(
      "select so.id from supplier_orders so where so.supplier_id = '00000000-0000-4000-a000-000000000001' and exists (select 1 from supplier_orders b where b.order_id = so.order_id and b.supplier_id <> so.supplier_id) order by so.created_at limit 1",
    );
    await signIn(page, "supplier.a@example.com");
    const words = [...SECRET_FIELDS, "£", "price_pence", "unit_price", "line_net", "total_pence", "Dev Supplier B", "Mango Drink"];
    for (const path of ["/supplier?show=all", `/supplier/orders/${so.id}`]) await scan(page.request, path, words, "Dev Restaurant");
    await scan(page.request, "/supplier", words);
  });

  test("driver: the job only: no prices, no costs, no other deliveries", async ({ request }) => {
    const [so] = await sql<{ id: string }>(
      "select so.id from supplier_orders so where so.supplier_id = '00000000-0000-4000-a000-000000000001' and so.status in ('placed', 'sent') and exists (select 1 from supplier_orders b where b.order_id = so.order_id and b.supplier_id <> so.supplier_id) order by so.created_at desc limit 1",
    );
    const token = randomBytes(32).toString("base64url");
    await sql("select public.create_driver_link($1, extensions.digest($2, 'sha256'), now() + interval '1 hour', null)", [so.id, token]);
    await scan(request, `/d/${token}`, [...SECRET_FIELDS, "£", "price_pence", "unit_price", "Mango Drink", "restaurant.a@example.com", "@example.com"], "Basant Basmati Rice");
  });
});
