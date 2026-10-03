/**
 * API-level security tests: the same attacks as rls.test.ts but through the real Supabase REST
 * API (PostgREST + GoTrue) with the PUBLIC anon key and real logins, i.e. exactly what anyone
 * holding the key from the browser bundle could try. Also checks the production bundle never
 * contains the service-role key.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect } from "./db";

// Well-known local-stack demo values (printed by `supabase start`); overridable via env.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const PASSWORD = "Password123!";

function anon(): SupabaseClient {
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signedIn(email: string): Promise<SupabaseClient> {
  const c = anon();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return c;
}

let customerA: SupabaseClient;
let customerB: SupabaseClient;
let pending: SupabaseClient;
let supplierA: SupabaseClient;
let db: Client;

beforeAll(async () => {
  [customerA, customerB, pending, supplierA] = await Promise.all([
    signedIn("restaurant.a@example.com"),
    signedIn("restaurant.b@example.com"),
    signedIn("pending@example.com"),
    signedIn("supplier.a@example.com"),
  ]);
  db = await connect();
});
afterAll(async () => {
  await db.query("delete from auth.users where email like 'api-attacker-%@example.com'");
  await db.end();
});

describe("anonymous REST API", () => {
  it("cannot select cost from product_variants", async () => {
    const { data, error } = await anon().from("product_variants").select("cost_pence");
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("gets catalogue sizes without any cost or supplier field", async () => {
    const { data, error } = await anon().from("catalogue_variants").select("*");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    for (const row of data!) {
      expect(Object.keys(row)).not.toEqual(expect.arrayContaining(["cost_pence"]));
      expect(row).not.toHaveProperty("supplier_id");
    }
  });

  it.each(["customers", "orders", "order_items", "customer_price_overrides", "customer_category_margins", "settings", "profiles", "invoices", "supplier_orders"])(
    "cannot read %s",
    async (table) => {
      const { data, error } = await anon().from(table).select("*");
      expect(data).toBeNull();
      expect(error?.code).toBe("42501");
    },
  );

  it.each([
    ["hit_rate_limit", { p_key: "x", p_limit: 1, p_window_seconds: 60 }],
    ["create_order_tx", { p: {} }],
    ["promote_to_admin", { p_email: "restaurant.a@example.com" }],
  ])("cannot call rpc %s", async (fn, args) => {
    const { error } = await anon().rpc(fn, args);
    expect(error).not.toBeNull();
    expect(["42501", "PGRST202"]).toContain(error!.code);
  });
});

describe("signed-in customers through the API", () => {
  it("customer A sees its own order and agreed price, never cost", async () => {
    const { data: orders } = await customerA.from("customer_orders").select("number");
    expect(orders).toEqual([{ number: 1001 }]);
    const { data: items } = await customerA.from("customer_order_items").select("*");
    expect(items!.length).toBe(2);
    for (const i of items!) expect(i).not.toHaveProperty("unit_cost_pence");
    const { error } = await customerA.from("customer_order_items").select("unit_cost_pence");
    expect(error).not.toBeNull();
  });

  it("customer A reads zero rows of costs, overrides, margins and base order tables", async () => {
    for (const table of ["product_variants", "customer_price_overrides", "customer_category_margins", "order_items", "orders", "customer_private"]) {
      const { data, error } = await customerA.from(table).select("*");
      expect(error, table).toBeNull();
      expect(data, table).toEqual([]);
    }
  });

  it("customer B cannot see A's order or A's agreed £17.00 mango price", async () => {
    const { data } = await customerB.from("customer_order_items").select("unit_price_pence, product_name");
    expect(data).toEqual([{ unit_price_pence: 1440, product_name: "Basant Basmati Rice" }]);
  });

  it("customer A cannot promote itself to admin or approve itself", async () => {
    const { data: me } = await customerA.auth.getUser();
    const r1 = await customerA.from("profiles").update({ role: "admin" }).eq("id", me.user!.id);
    expect(r1.error?.code).toBe("42501");
    const r2 = await customerA.from("customers").update({ status: "suspended" }).eq("business_name", "Dev Restaurant A");
    expect(r2.error?.code).toBe("42501");
  });

  it("customer A cannot set its own prices", async () => {
    const { error } = await customerA.from("customer_price_overrides").insert({
      customer_id: "20000000-0000-4000-a000-000000000001",
      variant_id: "50000000-0000-4000-a000-000000000001",
      price_pence: 1,
    });
    expect(error?.code).toBe("42501");
  });

  it("an unapproved customer gets no priced data and no bank details", async () => {
    for (const view of ["customer_orders", "customer_order_items", "shop_settings", "invoices"]) {
      const { data, error } = await pending.from(view).select("*");
      expect(error, view).toBeNull();
      expect(data, view).toEqual([]);
    }
  });
});

describe("supplier through the API", () => {
  it("sees its own order lines with no price or cost fields", async () => {
    const { data, error } = await supplierA.from("supplier_order_lines").select("*");
    expect(error).toBeNull();
    expect(data!.length).toBe(2);
    for (const row of data!) {
      for (const k of Object.keys(row)) expect(k).not.toMatch(/price|cost|vat|net|total/);
    }
  });

  it("cannot read orders, items, customers or prices", async () => {
    for (const table of ["orders", "order_items", "customers", "product_variants", "customer_price_overrides"]) {
      const { data } = await supplierA.from(table).select("*");
      expect(data, table).toEqual([]);
    }
  });
});

describe("self sign-up through the public Auth API", () => {
  it("metadata claiming admin, a customer link or a supplier link creates only a pending customer", async () => {
    const email = `api-attacker-${Date.now()}@example.com`;
    const { error } = await anon().auth.signUp({
      email,
      password: "Attack3r!pass",
      options: { data: { role: "admin", customer_id: "20000000-0000-4000-a000-000000000001", supplier_id: "00000000-0000-4000-a000-000000000001", business_name: "Attacker Ltd" } },
    });
    expect(error).toBeNull();
    const { rows } = await db.query(
      `select p.role, p.supplier_id, c.status, c.id = '20000000-0000-4000-a000-000000000001' as hijacked
         from public.profiles p left join public.customers c on c.id = p.customer_id where p.email = $1`,
      [email],
    );
    expect(rows).toEqual([{ role: "customer", supplier_id: null, status: "pending", hijacked: false }]);
  });
});

describe("service-role key never reaches the browser", () => {
  const staticDir = path.resolve(__dirname, "../../.next/static");
  it.skipIf(!existsSync(staticDir))("is absent from every file in .next/static", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = path.join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else {
          const text = readFileSync(p, "utf8");
          if (text.includes(SERVICE) || text.includes("SUPABASE_SERVICE_ROLE_KEY")) hits.push(p);
        }
      }
    };
    walk(staticDir);
    expect(hits).toEqual([]);
  });
});
