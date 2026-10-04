import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { signIn, sql } from "./helpers";

const A = "20000000-0000-4000-a000-000000000001";
const SUP_A = "00000000-0000-4000-a000-000000000001";
const SUP_B = "00000000-0000-4000-a000-000000000002";

/** A two-supplier order for restaurant A, through the real transaction (as the shop does). */
async function placeOrder(): Promise<{ orderId: string; number: number; soA: string; soB: string }> {
  const [r] = await sql<{ r: { order_id: string; number: number } }>("select public.create_order_tx($1::jsonb) r", [
    JSON.stringify({
      customer_id: A, placed_by: "10000000-0000-4000-a000-000000000004", checkout_key: randomUUID(),
      delivery_date: new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10), payment_terms: "on_delivery",
      note: "Ring the back bell",
      totals: { goods_net_pence: 14340, goods_vat_pence: 1020, delivery_net_pence: 1200, delivery_vat_pence: 85, vat_pence: 1105, total_pence: 16645 },
      supplier_orders: [
        { supplier_id: SUP_A, items: [{ variant_id: "50000000-0000-4000-a000-000000000002", product_name: "Basant Basmati Rice", size_label: "20 kg", qty: 2, unit_price_pence: 4620, unit_cost_pence: 4200, vat_rate_bp: 0, line_net_pence: 9240, line_vat_pence: 0 }] },
        { supplier_id: SUP_B, items: [{ variant_id: "50000000-0000-4000-a000-000000000003", product_name: "Mango Drink", size_label: "330 ml × 24", qty: 3, unit_price_pence: 1700, unit_cost_pence: 1450, vat_rate_bp: 2000, line_net_pence: 5100, line_vat_pence: 1020 }] },
      ],
    }),
  ]);
  const parts = await sql<{ id: string; supplier_id: string }>("select id, supplier_id from supplier_orders where order_id = $1", [r.r.order_id]);
  return {
    orderId: r.r.order_id,
    number: r.r.number,
    soA: parts.find((p) => p.supplier_id === SUP_A)!.id,
    soB: parts.find((p) => p.supplier_id === SUP_B)!.id,
  };
}

/** A driver link made directly in the database (same function the supplier screen uses). */
async function linkFor(supplierOrderId: string, expiresInHours = 72): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  await sql(`select public.create_driver_link($1, decode($2, 'hex'), now() + make_interval(hours => $3), null)`, [supplierOrderId, hash, expiresInHours]);
  return token;
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

test.describe("delivery", () => {
  test.beforeEach(async () => {
    await sql("update public.rate_limits set count = 0 where key like 'driver%'");
  });

  test("supplier accepts and sends a link; the driver submits from a phone; restaurant and supplier see the proof", async ({ page, browser }) => {
    const o = await placeOrder();
    const ref = `ORDER-${o.number}`;

    await signIn(page, "supplier.a@example.com");
    await expect(page).toHaveURL(/\/supplier$/);
    await page.getByRole("link", { name: new RegExp(`New order ${ref}`) }).click();
    await expect(page.getByRole("heading", { level: 1, name: ref })).toBeVisible();
    await expect(page.getByText("Basant Basmati Rice")).toBeVisible();
    await expect(page.getByText("Mango Drink")).toHaveCount(0); // supplier B's part
    await expect(page.getByText("£")).toHaveCount(0); // no prices for suppliers
    await page.getByRole("button", { name: "Accept order" }).click();
    await expect(page.getByText("With the supplier").first()).toBeVisible();
    await page.getByRole("button", { name: "Make driver link" }).click();
    const url = await page.getByTestId("driver-link").textContent();
    expect(url).toMatch(/\/d\/[A-Za-z0-9_-]{43}$/);
    const path = new URL(url!).pathname;

    // The driver: a phone, no account.
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const d = await phone.newPage();
    await d.goto(path);
    await expect(d.getByRole("heading", { name: "Dev Restaurant A" })).toBeVisible();
    await expect(d.getByText("Ring the back bell")).toBeVisible();
    await d.getByRole("button", { name: "Submit proof of delivery" }).click();
    await expect(d.getByText("Take a photo of the delivery.")).toBeVisible();
    await d.locator("#proof-photo").setInputFiles("tests/fixtures/delivery-photo.jpg");
    await expect(d.getByRole("img", { name: "Delivery photo preview" })).toBeVisible();
    await d.getByRole("button", { name: "Submit proof of delivery" }).click();
    await expect(d.getByText("Add the signed delivery note, or ask the customer to sign on screen.")).toBeVisible();
    await sign(d);
    await d.getByLabel("Name of the person signing (optional)").fill("Priya");
    await d.getByRole("button", { name: "Submit proof of delivery" }).click();
    await expect(d).toHaveURL(new RegExp(`${path}/done$`));
    await expect(d.getByRole("heading", { name: "Delivery recorded" })).toBeVisible();
    // The link works once.
    await d.goto(path);
    await expect(d.getByRole("heading", { name: "Delivery already recorded" })).toBeVisible();
    await phone.close();

    const [so] = await sql<{ status: string; order_status: string }>(
      "select so.status::text, o.status::text order_status from supplier_orders so join orders o on o.id = so.order_id where so.id = $1",
      [o.soA],
    );
    expect(so).toEqual({ status: "delivered", order_status: "partially_delivered" });
    const [proof] = await sql<{ kind: string; name: string; photo: string; sig: string; files: number }>(
      `select submitted_by_kind::text kind, signed_by_name name, photo_path photo, signature_path sig,
              (select count(*)::int from storage.objects where bucket_id = 'delivery-proofs' and name in (dp.photo_path, dp.signature_path)) files
         from delivery_proofs dp where supplier_order_id = $1 and submitted_at is not null`,
      [o.soA],
    );
    expect(proof).toMatchObject({ kind: "driver", name: "Priya", files: 2 });
    expect(proof.photo).toMatch(new RegExp(`^${o.soA}/.+/photo\\.jpg$`));
    expect(proof.sig).toMatch(/signature\.png$/);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Proof of delivery" })).toBeVisible();
    await expect(page.getByText("signed for by Priya")).toBeVisible();

    // The restaurant sees the proof on its order, served through short-lived private links.
    const ctx = await browser.newContext();
    const r = await ctx.newPage();
    await signIn(r, "restaurant.a@example.com");
    await r.goto(`/orders/${o.orderId}`);
    await expect(r.getByText("Part delivered")).toBeVisible();
    const photo = r.getByRole("img", { name: "Delivery photo" });
    await expect(photo).toBeVisible();
    expect(await photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(await photo.getAttribute("src")).toMatch(/\/storage\/v1\/object\/sign\/delivery-proofs\/.+token=/);
    await expect(r.getByRole("img", { name: "Signature of Priya" })).toBeVisible();
    const [note] = await sql<{ title: string }>(
      "select n.title from notifications n join profiles p on p.id = n.user_id where p.email = 'restaurant.a@example.com' and n.link = $1",
      [`/orders/${o.orderId}`],
    );
    expect(note.title).toBe(`Delivery 1 of 2 for ${ref} delivered`);

    // Supplier B uploads the proof itself (photo + signed note as a PDF): the order is delivered.
    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    await signIn(b, "supplier.b@example.com");
    await b.goto(`/supplier/orders/${o.soB}`);
    await b.getByText("Upload the proof yourself").click();
    await b.locator("#proof-photo").setInputFiles("tests/fixtures/delivery-photo.jpg");
    await b.locator("#proof-document").setInputFiles("tests/fixtures/signed-note.pdf");
    await expect(b.getByText("signed-note.pdf")).toBeVisible();
    await b.getByRole("button", { name: "Save proof and mark delivered" }).click();
    await expect(b.getByRole("heading", { name: "Proof of delivery" })).toBeVisible();
    await expect(b.getByText("Signed delivery note (PDF)")).toBeVisible();
    const [done] = await sql<{ status: string }>("select status::text from orders where id = $1", [o.orderId]);
    expect(done.status).toBe("delivered");
    await r.reload();
    await expect(r.getByText("Delivered", { exact: true }).first()).toBeVisible();
    await expect(r.getByRole("heading", { name: "Proof of delivery" })).toHaveCount(2);
    await ctx.close();
    await ctxB.close();
  });

  test("forged, replaced and expired links are refused; files are checked by their bytes", async ({ page, browser }) => {
    const o = await placeOrder();

    await page.goto(`/d/${randomBytes(32).toString("base64url")}`);
    await expect(page.getByRole("heading", { name: "This link is not valid" })).toBeVisible();
    await page.goto("/d/not-even-a-token");
    await expect(page.getByRole("heading", { name: "This link is not valid" })).toBeVisible();

    const first = await linkFor(o.soA);
    const second = await linkFor(o.soA); // revokes the first
    await page.goto(`/d/${first}`);
    await expect(page.getByRole("heading", { name: "A newer link was sent" })).toBeVisible();

    const old = await linkFor(o.soB, -1);
    await page.goto(`/d/${old}`);
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();

    // A text file named .jpg: the phone cannot shrink it, so it is sent as is and the server refuses it.
    await page.goto(`/d/${second}`);
    await page.locator("#proof-photo").setInputFiles("tests/fixtures/not-a-photo.jpg");
    await expect(page.getByRole("img", { name: "Delivery photo preview" })).toBeAttached();
    await sign(page);
    await page.getByRole("button", { name: "Submit proof of delivery" }).click();
    await expect(page.getByText("The delivery photo must be a JPEG, PNG, WebP or HEIC picture.")).toBeVisible();
    const [{ n }] = await sql<{ n: number }>("select count(*)::int n from delivery_proofs where supplier_order_id = $1 and submitted_at is not null", [o.soA]);
    expect(n).toBe(0);

    // Suppliers only reach their own orders; restaurants never reach the supplier area.
    const ctx = await browser.newContext();
    const s = await ctx.newPage();
    await signIn(s, "supplier.a@example.com");
    expect((await s.goto(`/supplier/orders/${o.soB}`))?.status()).toBe(404);
    await ctx.close();
    const ctx2 = await browser.newContext();
    const r = await ctx2.newPage();
    await signIn(r, "restaurant.a@example.com");
    expect((await r.goto(`/supplier/orders/${o.soA}`))?.status()).toBe(403);
    await ctx2.close();
  });
});
