import { createHmac, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { signIn, sql } from "./helpers";

const PASSWORD = "Password123!";
const MAILPIT = "http://127.0.0.1:54324/api/v1";

/** RFC 6238 time-based one-time password (SHA-1, 6 digits, 30 s), enough to act as the authenticator app. */
function totp(secretBase32: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secretBase32.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/** A code that differs from `previous` (waits for the next 30-second window when needed): replays are refused. */
async function nextCode(secret: string, previous?: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const c = totp(secret);
    if (c !== previous) return c;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("no fresh code");
}

async function mailTo(to: string, subject: string): Promise<{ text: string; html: string }> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:"${to}" subject:"${subject}"`)}`);
    const body = (await res.json()) as { messages: { ID: string }[] };
    if (body.messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/message/${body.messages[0].ID}`)).json()) as { Text: string; HTML: string };
      return { text: msg.Text, html: msg.HTML };
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`no email "${subject}" to ${to}`);
}

async function createAdminUser(email: string) {
  await sql(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
     select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"E2E Two Step"}'::jsonb, now(), now(), '', '', '', '', '', '', '', ''`,
    [email, PASSWORD],
  );
  await sql(
    `insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     select gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
       from auth.users u where u.email = $1`,
    [email],
  );
  await sql("update public.profiles set role = 'admin' where email = $1", [email]);
}

test.describe("Phase 13 fixes", () => {
  test("typing a quantity keeps the digits (5 stays 5, not 15)", async ({ page }) => {
    await signIn(page, "restaurant.a@example.com");
    await page.goto("/shop/p/mango-drink", { waitUntil: "load" });
    const box = page.getByRole("textbox", { name: "Quantity of Mango Drink 330 ml × 24", exact: true });
    await box.click();
    await box.press("Control+A");
    await box.press("Backspace");
    await box.pressSequentially("5");
    await expect(box).toHaveValue("5");
    await box.press("Backspace");
    await box.pressSequentially("12");
    await expect(box).toHaveValue("12");
    await box.press("Control+A");
    await box.press("Backspace");
    await box.blur();
    await expect(box).toHaveValue("1");
  });

  test("a bad admin address keeps the admin menu and says the page was not found", async ({ page }) => {
    await signIn(page, "admin@example.com");
    for (const path of ["/admin/zzz-not-a-page", `/admin/orders/${randomUUID()}`, `/admin/customers/${randomUUID()}`]) {
      // (The status code stays 200 inside the admin area because the page streams behind its loading skeleton; the page
      // itself says "not found", keeps the menu, and is marked noindex by Next.)
      await page.goto(path, { waitUntil: "load" });
      await expect(page.getByRole("heading", { level: 1, name: "We can't find that page" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Orders", exact: true }).first()).toBeVisible();
    }
  });

  test("terms, privacy and cookies are public, linked from the footer, robots and sitemap exist", async ({ page, request }) => {
    for (const [path, heading] of [["/terms", "Terms of trade"], ["/privacy", "Privacy policy"], ["/cookies", "Cookie notice"]] as const) {
      const res = await page.goto(path, { waitUntil: "load" });
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText("Home High Street Limited").first()).toBeVisible();
    }
    await page.goto("/", { waitUntil: "load" });
    for (const name of ["Terms of trade", "Privacy", "Cookies"]) await expect(page.getByRole("contentinfo").getByRole("link", { name })).toBeVisible();
    await page.goto("/register", { waitUntil: "load" });
    await expect(page.getByRole("link", { name: "Terms of trade" })).toBeVisible();
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap:");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/terms");
    expect(sitemap).toContain("category=rice");
  });

  test("a supplier login made with 'set a password now' signs in", async ({ page, browser }) => {
    const email = `e2e-supplier-pw-${Date.now()}@example.com`;
    await signIn(page, "admin@example.com");
    await page.goto("/admin/suppliers/00000000-0000-4000-a000-000000000001", { waitUntil: "load" });
    await page.locator('input[name="full_name"]').fill("Pat Password");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="login"][value="password"]').check();
    await page.locator('input[name="password"]').fill("Supplier-pass-123");
    await page.getByRole("button", { name: "Create login" }).click();
    await expect(page.getByText(`Login created for ${email}`)).toBeVisible();
    const other = await (await browser.newContext()).newPage();
    await signIn(other, email, "Supplier-pass-123");
    await expect(other).toHaveURL(/\/supplier/);
  });

  test("the driver page lists only the lines still on the order", async ({ page }) => {
    const { createHash, randomBytes } = await import("node:crypto");
    const A = "20000000-0000-4000-a000-000000000001";
    const SUP_A = "00000000-0000-4000-a000-000000000001";
    const [r] = await sql<{ r: { order_id: string } }>("select public.create_order_tx($1::jsonb) r", [
      JSON.stringify({
        customer_id: A, placed_by: "10000000-0000-4000-a000-000000000004", checkout_key: randomUUID(),
        delivery_date: new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10), payment_terms: "on_delivery",
        totals: { goods_net_pence: 9240, goods_vat_pence: 0, delivery_net_pence: 0, delivery_vat_pence: 0, vat_pence: 0, total_pence: 9240 },
        supplier_orders: [{ supplier_id: SUP_A, items: [{ variant_id: "50000000-0000-4000-a000-000000000002", product_name: "E2E Removed Rice", size_label: "20 kg", qty: 2, unit_price_pence: 4620, unit_cost_pence: 4200, vat_rate_bp: 0, line_net_pence: 9240, line_vat_pence: 0 }] }],
      }),
    ]);
    const [so] = await sql<{ id: string }>("select id from supplier_orders where order_id = $1", [r.r.order_id]);
    await sql(
      `insert into order_items (order_id, supplier_order_id, supplier_id, product_name, size_label, qty, unit_price_pence, vat_rate_bp, line_net_pence, line_vat_pence, sort)
       values ($1, $2, $3, 'E2E Kept Lentils', '5 kg', 1, 100, 0, 100, 0, 9)`,
      [r.r.order_id, so.id, SUP_A],
    );
    await sql("update order_items set removed_at = now() where order_id = $1 and product_name = 'E2E Removed Rice'", [r.r.order_id]);
    const token = randomBytes(32).toString("base64url");
    await sql(`select public.create_driver_link($1, decode($2, 'hex'), now() + interval '72 hours', null)`, [so.id, createHash("sha256").update(token).digest("hex")]);
    await page.goto(`/d/${token}`, { waitUntil: "load" });
    await expect(page.getByText("E2E Kept Lentils")).toBeVisible();
    await expect(page.getByText("E2E Removed Rice")).toHaveCount(0);
  });
});

test.describe("Cost import", () => {
  test("download the sheet, fill two costs, preview, apply", async ({ page }) => {
    const rows = await sql<{ id: string; name: string; size_label: string }>(
      "select v.id, p.name, v.size_label from product_variants v join products p on p.id = v.product_id where v.source_ref is not null and v.cost_pence is null and p.source = 'sample' order by p.name limit 2",
    );
    expect(rows).toHaveLength(2);
    try {
      await signIn(page, "admin@example.com");
      await page.goto("/admin/products/costs", { waitUntil: "load" });
      const sheet = await page.request.get("/admin/products/costs/sheet.csv?only=missing");
      expect(sheet.status()).toBe(200);
      const lines = (await sheet.text()).trim().split(/\r?\n/);
      expect(lines[0]).toBe("category,product,size,supplier,sku,cost,vat,variant_id");
      expect(lines.length).toBeGreaterThan(2);
      const csv = ["variant_id,cost,vat", `${rows[0].id},£12.50,`, `${rows[1].id},3.2,5`, "not-a-real-id,9,", `${randomUUID()},4,`].join("\n");
      await page.locator('input[type="file"]').setInputFiles({ name: "costs.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
      await page.getByRole("button", { name: "Preview changes" }).click();
      await expect(page.getByText("Preview only: nothing has been saved yet")).toBeVisible();
      await expect(page.getByText(`${rows[0].name} · ${rows[0].size_label}`)).toBeVisible();
      await expect(page.getByText("1 row did not match any size")).toBeVisible();
      await expect(page.getByText("1 row was not read")).toBeVisible();
      const before = await sql<{ n: number }>("select count(*)::int n from product_variants where id = any($1::uuid[]) and cost_pence is not null", [rows.map((r) => r.id)]);
      expect(before[0].n).toBe(0);
      await page.getByRole("button", { name: "Apply 2 changes" }).click();
      await expect(page.getByText("Costs saved")).toBeVisible();
      const after = await sql<{ id: string; cost_pence: number; vat_rate_bp: number }>("select id, cost_pence::int, vat_rate_bp from product_variants where id = any($1::uuid[])", [rows.map((r) => r.id)]);
      expect(after.find((a) => a.id === rows[0].id)?.cost_pence).toBe(1250);
      const second = after.find((a) => a.id === rows[1].id)!;
      expect([second.cost_pence, second.vat_rate_bp]).toEqual([320, 500]);
      const audit = await sql<{ n: number }>("select count(*)::int n from audit_log where entity = 'product_variants' and entity_id = any($1::text[]) and at > now() - interval '2 minutes'", [rows.map((r) => r.id)]);
      expect(audit[0].n).toBeGreaterThanOrEqual(2);
    } finally {
      await sql("update product_variants set cost_pence = null, vat_rate_bp = 0 where id = any($1::uuid[])", [rows.map((r) => r.id)]);
    }
  });

  test("a restaurant cannot open the import or download the sheet", async ({ page }) => {
    await signIn(page, "restaurant.a@example.com");
    const sheet = await page.request.get("/admin/products/costs/sheet.csv");
    expect(sheet.status()).toBe(403);
    const res = await page.goto("/admin/products/costs", { waitUntil: "load" });
    expect(res?.status()).toBe(403);
  });
});

test.describe("Email", () => {
  test("a placed order sends the confirmation and the supplier email (no prices), and the admin can send a test", async ({ page }) => {
    const A = "20000000-0000-4000-a000-000000000001";
    const SUP_A = "00000000-0000-4000-a000-000000000001";
    const [r] = await sql<{ r: { number: number } }>("select public.create_order_tx($1::jsonb) r", [
      JSON.stringify({
        customer_id: A, placed_by: "10000000-0000-4000-a000-000000000004", checkout_key: randomUUID(),
        delivery_date: new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10), payment_terms: "on_delivery",
        totals: { goods_net_pence: 9240, goods_vat_pence: 0, delivery_net_pence: 0, delivery_vat_pence: 0, vat_pence: 0, total_pence: 9240 },
        supplier_orders: [{ supplier_id: SUP_A, items: [{ variant_id: "50000000-0000-4000-a000-000000000002", product_name: "E2E Mail Rice", size_label: "20 kg", qty: 2, unit_price_pence: 4620, unit_cost_pence: 4200, vat_rate_bp: 0, line_net_pence: 9240, line_vat_pence: 0 }] }],
      }),
    ]);
    const ref = `ORDER-${r.r.number}`;
    await signIn(page, "admin@example.com");
    await page.goto("/admin/emails", { waitUntil: "load" });
    await expect(page.getByText("Email is on")).toBeVisible();
    await page.getByRole("button", { name: /^Send \d+ waiting$/ }).click();
    await expect(page.getByText(/emails? sent/)).toBeVisible();
    const customer = await mailTo("restaurant.a@example.com", `Order ${ref} confirmed`);
    expect(customer.text).toContain("£92.40");
    expect(customer.text).toContain("E2E Mail Rice");
    const supplier = await mailTo("supplier.a@example.com", `New order ${ref}`);
    expect(supplier.text).toContain("2 × E2E Mail Rice (20 kg)");
    expect(supplier.text).not.toMatch(/£|price|cost/i);
    const logged = await sql<{ status: string }>("select status::text from email_log where subject like $1", [`%${ref}%`]);
    expect(logged.length).toBeGreaterThanOrEqual(2);
    expect(logged.every((l) => l.status === "sent")).toBe(true);

    await page.getByRole("button", { name: "Send me a test email" }).click();
    await expect(page.getByText("Test email sent to admin@example.com")).toBeVisible();
    expect((await mailTo("admin@example.com", "Test email from Wholesale Street")).text).toContain("If you can read this");
  });

  test("a new registration emails the team and a confirmed approval emails the restaurant", async ({ page, browser }) => {
    const email = `e2e-mail-reg-${Date.now()}@example.com`;
    await page.goto("/register", { waitUntil: "load" });
    await page.getByLabel("Restaurant or business name").fill(`E2E Mail Kitchen ${Date.now()}`);
    await page.getByLabel("Your name").fill("Mel Mail");
    await page.getByLabel("Phone").fill("07700 900123");
    await page.getByLabel("Address line 1").fill("3 Mail Road");
    await page.getByLabel("Town or city").fill("London");
    await page.getByLabel("Postcode").fill("E1 6AN");
    await page.getByLabel("Email").fill(email);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('input[name="confirm_password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Create trade account" }).click();
    await expect(page).toHaveURL(/\/register\/pending/);
    const team = await mailTo("team@example.com", "New trade account to review");
    expect(team.text).toContain("Mel Mail");
    // Approve from the admin screen: the restaurant gets the "approved" email.
    const admin = await (await browser.newContext()).newPage();
    await signIn(admin, "admin@example.com");
    await admin.goto("/admin/approvals");
    await admin.getByRole("link", { name: /E2E Mail Kitchen/ }).click();
    await admin.getByRole("button", { name: "Approve account" }).click();
    await expect(admin.getByText("Approved.", { exact: true })).toBeVisible();
    const approved = await mailTo(email, "Your trade account is approved");
    expect(approved.text).toContain("Sign in and order");
  });
});

test.describe("Two-step sign-in for the admin", () => {
  test("turn it on, sign in with a code, refuse a wrong one, turn it off", async ({ page, browser }) => {
    test.setTimeout(150_000);
    const email = `e2e-2fa-admin-${Date.now()}@example.com`;
    await createAdminUser(email);

    // Set up.
    await signIn(page, email);
    await expect(page).toHaveURL(/\/admin/);
    await page.goto("/admin/security", { waitUntil: "load" });
    await page.getByRole("button", { name: "Set up two-step sign-in" }).click();
    const secret = (await page.locator("p.font-mono").textContent())!.trim();
    expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
    const first = await nextCode(secret);
    await page.locator('input[name="code"]').fill(first);
    await page.getByRole("button", { name: "Turn on two-step sign-in" }).click();
    await expect(page.getByText("Two-step sign-in is on.")).toBeVisible();

    // A fresh password-only sign-in is stopped at the code screen, and the database agrees.
    const other: Page = await (await browser.newContext()).newPage();
    await signIn(other, email);
    await expect(other).toHaveURL(/\/two-step/);
    await other.goto("/admin/orders", { waitUntil: "load" });
    await expect(other).toHaveURL(/\/two-step/);
    await other.locator('input[name="code"]').fill("000000");
    await other.getByRole("button", { name: "Continue" }).click();
    await expect(other.getByText("That code is not right")).toBeVisible();
    const second = await nextCode(secret, first);
    await other.locator('input[name="code"]').fill(second);
    await other.getByRole("button", { name: "Continue" }).click();
    await expect(other).toHaveURL(/\/admin$/);
    await other.goto("/admin/orders", { waitUntil: "load" });
    await expect(other.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();

    // Switch it off with a fresh code.
    await other.goto("/admin/security", { waitUntil: "load" });
    const third = await nextCode(secret, second);
    await other.locator('input[name="code"]').fill(third);
    await other.getByRole("button", { name: "Switch off two-step sign-in" }).click();
    await expect(other.getByText("Two-step sign-in is off.")).toBeVisible();
    const left = await sql<{ n: number }>("select count(*)::int n from auth.mfa_factors f join auth.users u on u.id = f.user_id where u.email = $1", [email]);
    expect(left[0].n).toBe(0);
  });
});
