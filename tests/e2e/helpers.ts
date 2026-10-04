import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

export const PASSWORD = "Password123!";
const MAILPIT = "http://127.0.0.1:54324/api/v1";

/**
 * Submits the login form. Waits until the app has navigated away from /login. The suite signs in
 * far more than 50 times from 127.0.0.1, so the login counters are cleared first; the limits
 * itself is tested with submitLogin in auth.spec.ts.
 */
export async function signIn(page: Page, email: string, password = PASSWORD, path = "/login") {
  await sql("update public.rate_limits set count = 0 where key like 'login%'");
  await submitLogin(page, email, password, path);
  await expect(page).not.toHaveURL(/\/login(\?|$)/);
}

/** Submits the login form without waiting for success (for failure cases). */
export async function submitLogin(page: Page, email: string, password: string, path = "/login") {
  await page.goto(path, { waitUntil: "load" });
  await page.getByLabel("Email").fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** The form's own alert (Next also renders an empty role=alert route announcer). */
export function formAlert(page: Page) {
  return page.locator("main").getByRole("alert");
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await expect(page).toHaveURL(/\/login\?notice=signed-out/);
}

/** Waits for an email to `to` whose subject contains `subject`, and returns the /auth/confirm link. */
export async function emailLink(to: string, subject: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:"${to}" subject:"${subject}"`)}`);
    const body = (await res.json()) as { messages: { ID: string }[] };
    if (body.messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/message/${body.messages[0].ID}`)).json()) as { HTML: string };
      const m = /href="([^"]*\/auth\/confirm\?[^"]+)"/.exec(msg.HTML);
      if (!m) throw new Error("no confirm link in email");
      return m[1].replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no email "${subject}" for ${to}`);
}

export async function sql<T extends Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
  await db.connect();
  try {
    return (await db.query<T>(query, params)).rows;
  } finally {
    await db.end();
  }
}

/**
 * A confirmed self-registration (pending customer), made through the Auth admin API instead of
 * the register form + email (those are covered in auth.spec.ts). handle_new_user() creates the
 * pending customer from the metadata, exactly as for a real sign-up.
 */
export async function registeredRestaurant(email: string, businessName: string): Promise<string> {
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
    { auth: { persistSession: false } },
  );
  const { error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { business_name: businessName, contact_name: "E2E Contact", phone: "07700 900456", address_line1: "2 Test Road", city: "London", postcode: "E2 7AA" },
  });
  if (error) throw new Error(`create registration: ${error.message}`);
  const [row] = await sql<{ id: string }>("select c.id from profiles p join customers c on c.id = p.customer_id where p.email = $1", [email]);
  return row.id;
}
