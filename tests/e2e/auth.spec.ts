import { expect, test } from "@playwright/test";
import { emailLink, formAlert, PASSWORD, signIn, signOut, sql, submitLogin } from "./helpers";

test.describe("one login routes each role to its own area", () => {
  for (const [email, url, heading] of [
    ["admin@example.com", "/admin", /Hello, Dev/],
    ["supplier.a@example.com", "/supplier", /Your orders/],
    ["restaurant.a@example.com", "/shop", /Your catalogue/],
    ["pending@example.com", "/register/pending", /reviewing your account/],
  ] as const) {
    test(`${email} lands on ${url}`, async ({ page }) => {
      await signIn(page, email);
      await expect(page).toHaveURL(new RegExp(`${url.replace(/\//g, "\\/")}$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    });
  }

  test("a wrong password shows one generic error", async ({ page }) => {
    await submitLogin(page, "restaurant.a@example.com", "not-the-password1");
    await expect(formAlert(page)).toHaveText("Email or password is incorrect.");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("an unknown email gets the same generic error", async ({ page }) => {
    await submitLogin(page, "nobody@example.com", "whatever123");
    await expect(formAlert(page)).toHaveText("Email or password is incorrect.");
  });
});

test.describe("access control in the browser", () => {
  test("signed-out visitors are sent to login and returned afterwards", async ({ page }) => {
    await page.goto("/admin/users", { waitUntil: "load" });
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers$/);
    await page.getByLabel("Email").fill("admin@example.com");
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
  });

  test("a ?next outside the user's own area is ignored (no open redirect)", async ({ page }) => {
    await signIn(page, "restaurant.a@example.com", PASSWORD, "/login?next=https%3A%2F%2Fevil.example%2F");
    await expect(page).toHaveURL(/\/shop$/);
  });

  test("a restaurant gets 403 on admin and supplier pages", async ({ page }) => {
    await signIn(page, "restaurant.a@example.com");
    await expect(page).toHaveURL(/\/shop$/);
    for (const path of ["/admin", "/admin/users", "/supplier"]) {
      const res = await page.goto(path, { waitUntil: "load" });
      expect(res?.status(), path).toBe(403);
      await expect(page.getByRole("heading", { name: "You don't have access to this page" })).toBeVisible();
    }
  });

  test("a supplier gets 403 on the shop and admin", async ({ page }) => {
    await signIn(page, "supplier.a@example.com");
    for (const path of ["/shop", "/admin"]) {
      const res = await page.goto(path, { waitUntil: "load" });
      expect(res?.status(), path).toBe(403);
    }
  });

  test("an unapproved restaurant is held on the pending page", async ({ page }) => {
    await signIn(page, "pending@example.com");
    for (const path of ["/shop", "/basket", "/orders", "/invoices"]) {
      await page.goto(path, { waitUntil: "load" });
      await expect(page, path).toHaveURL(/\/register\/pending$/);
    }
  });

  test("the supplier's page shows its orders and never a price", async ({ page }) => {
    await signIn(page, "supplier.a@example.com");
    await expect(page.getByRole("cell", { name: "#1001" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "#1002" })).toBeVisible();
    const html = await page.content();
    expect(html).not.toMatch(/£|unit_price|cost_pence|1700|4620/);
  });

  test("sign out ends the session", async ({ page }) => {
    await signIn(page, "restaurant.a@example.com");
    await expect(page).toHaveURL(/\/shop$/);
    await signOut(page);
    await page.goto("/shop", { waitUntil: "load" });
    await expect(page).toHaveURL(/\/login\?next=%2Fshop$/);
  });
});

test.describe.serial("self-registration, approval and password reset", () => {
  const email = `e2e-reg-${Date.now()}@example.com`;
  const newPassword = "NewPassw0rd!";

  test("the form validates on the server", async ({ page }) => {
    await page.goto("/register", { waitUntil: "load" });
    await page.getByRole("button", { name: "Create trade account" }).click();
    await expect(page.getByText("Enter your restaurant's name")).toBeVisible();
    await expect(page.getByText("Enter a valid UK postcode")).toBeVisible();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
  });

  test("register -> confirm email -> pending review", async ({ page }) => {
    await page.goto("/register", { waitUntil: "load" });
    await page.getByLabel("Restaurant or business name").fill("E2E Curry House");
    await page.getByLabel("Your name").fill("Erin Tester");
    await page.getByLabel("Phone").fill("07700 900123");
    await page.getByLabel("Address line 1").fill("1 Test Street");
    await page.getByLabel("Town or city").fill("London");
    await page.getByLabel("Postcode").fill("e1 6an");
    await page.getByLabel("Email").fill(email);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('input[name="confirm_password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Create trade account" }).click();
    await expect(page).toHaveURL(/\/register\/pending$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your inbox");

    const [row] = await sql<{ role: string; status: string; postcode: string }>(
      "select p.role, c.status, c.postcode from profiles p join customers c on c.id = p.customer_id where p.email = $1",
      [email],
    );
    expect(row).toEqual({ role: "customer", status: "pending", postcode: "E1 6AN" });

    const link = await emailLink(email, "Confirm your email");
    await page.goto(link, { waitUntil: "load" });
    await expect(page).toHaveURL(/\/register\/pending$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thanks, we're reviewing your account");
    await expect(page.getByText("E2E Curry House")).toBeVisible();
    await page.goto("/shop", { waitUntil: "load" });
    await expect(page).toHaveURL(/\/register\/pending$/);
  });

  test("once approved, the same account signs in to the shop", async ({ page }) => {
    // The approval screen is Phase 4; approve the way it will (status change by an admin).
    await sql("update customers set status = 'approved', approved_at = now() where email = $1", [email]);
    await signIn(page, email);
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.getByRole("main").getByText("E2E Curry House")).toBeVisible();
  });

  test("forgot password -> email link -> new password -> sign in with it", async ({ page }) => {
    await page.goto("/forgot-password", { waitUntil: "load" });
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Check your email")).toBeVisible();

    const link = await emailLink(email, "Reset your password");
    await page.goto(link, { waitUntil: "load" });
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.locator('input[name="password"]').fill(newPassword);
    await page.locator('input[name="confirm_password"]').fill("different1");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
    await page.locator('input[name="password"]').fill(newPassword);
    await page.locator('input[name="confirm_password"]').fill(newPassword);
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page).toHaveURL(/\/shop$/);

    await signOut(page);
    await submitLogin(page, email, PASSWORD);
    await expect(formAlert(page)).toHaveText("Email or password is incorrect.");
    await signIn(page, email, newPassword);
    await expect(page).toHaveURL(/\/shop$/);
  });

  test("a used reset link cannot be used again", async ({ page }) => {
    const link = await emailLink(email, "Reset your password");
    await page.goto(link, { waitUntil: "load" });
    await expect(page).toHaveURL(/\/login\?notice=link-expired$/);
    await expect(page.getByText("That link has expired or has already been used.")).toBeVisible();
  });

  test("forgot password does not reveal whether an account exists", async ({ page }) => {
    await page.goto("/forgot-password", { waitUntil: "load" });
    await page.getByLabel("Email").fill("e2e-nobody@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Check your email")).toBeVisible();
  });
});

test.describe.serial("admin-created accounts (invite flow)", () => {
  const restaurant = `e2e-invite-${Date.now()}@example.com`;
  const supplier = `e2e-supplier-${Date.now()}@example.com`;

  test("admin invites a restaurant; they set a password and land in the shop", async ({ page, browser }) => {
    await signIn(page, "admin@example.com");
    await page.goto("/admin/users", { waitUntil: "load" });
    await page.getByLabel("Full name").fill("Ivy Invitee");
    await page.getByLabel("Email").fill(restaurant);
    await page.getByLabel("Restaurant or business name").fill("E2E Invited Bistro");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText(`Invitation sent to ${restaurant}.`)).toBeVisible();
    await expect(page.getByRole("cell", { name: /Ivy Invitee/ })).toBeVisible();

    const [audit] = await sql<{ actor_id: string }>(
      "select actor_id from audit_log where entity = 'customers' and after->>'business_name' = 'E2E Invited Bistro' and action = 'insert'",
    );
    expect(audit.actor_id).toBe("10000000-0000-4000-a000-000000000001");

    const invitee = await (await browser.newContext()).newPage();
    await invitee.goto(await emailLink(restaurant, "set your password"), { waitUntil: "load" });
    await expect(invitee).toHaveURL(/\/auth\/invite$/);
    await expect(invitee.getByRole("heading", { level: 1 })).toHaveText("Welcome, Ivy");
    await invitee.locator('input[name="password"]').fill("Invited123!");
    await invitee.locator('input[name="confirm_password"]').fill("Invited123!");
    await invitee.getByRole("button", { name: "Set password and continue" }).click();
    await expect(invitee).toHaveURL(/\/shop$/);
    await expect(invitee.getByRole("main").getByText("E2E Invited Bistro")).toBeVisible();
  });

  test("admin invites a supplier user for a new supplier; they land in the supplier area", async ({ page, browser }) => {
    await signIn(page, "admin@example.com");
    await page.goto("/admin/users", { waitUntil: "load" });
    await page.getByRole("group", { name: "Account type" }).getByText("Supplier", { exact: true }).click();
    await page.getByLabel("Full name").fill("Sol Supplier");
    await page.getByLabel("Email").fill(supplier);
    await page.getByLabel("Or new supplier name").fill("E2E Wholesale Ltd");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText(`Invitation sent to ${supplier}.`)).toBeVisible();

    const invitee = await (await browser.newContext()).newPage();
    await invitee.goto(await emailLink(supplier, "set your password"), { waitUntil: "load" });
    await invitee.locator('input[name="password"]').fill("Invited123!");
    await invitee.locator('input[name="confirm_password"]').fill("Invited123!");
    await invitee.getByRole("button", { name: "Set password and continue" }).click();
    await expect(invitee).toHaveURL(/\/supplier$/);
    await expect(invitee.getByText("E2E Wholesale Ltd")).toBeVisible();
    await expect(invitee.getByText("No orders yet")).toBeVisible();
  });

  test("inviting an existing email is refused", async ({ page }) => {
    await signIn(page, "admin@example.com");
    await page.goto("/admin/users", { waitUntil: "load" });
    await page.getByLabel("Full name").fill("Dup");
    await page.getByLabel("Email").fill("restaurant.a@example.com");
    await page.getByLabel("Restaurant or business name").fill("Dup Ltd");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText("Someone already has an account with this email.")).toBeVisible();
  });
});

test("sign-in is rate limited per account", async ({ page }) => {
  const email = `e2e-ratelimit-${Date.now()}@example.com`;
  for (let i = 0; i < 10; i++) {
    await submitLogin(page, email, "wrong-password-1");
    await expect(formAlert(page)).toHaveText("Email or password is incorrect.");
  }
  await submitLogin(page, email, "wrong-password-1");
  await expect(formAlert(page)).toContainText("Too many sign-in attempts");
});
