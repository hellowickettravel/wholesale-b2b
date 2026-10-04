/**
 * Database security tests: each test tries something a role must NOT be able to do, directly
 * against Postgres with that role's privileges and JWT claims, and asserts that it fails.
 * Positive controls show the same role CAN do what it legitimately needs, so a test cannot pass
 * just because everything is broken.
 */
import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asOwner, connect, DENIED, IDS, outcome, type Actor } from "./db";

let db: Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const NON_ADMINS: Actor[] = ["anon", "customerA", "customerB", "pending", "supplierA", "supplierB"];
const SIGNED_IN_NON_ADMINS: Actor[] = ["customerA", "customerB", "pending", "supplierA", "supplierB"];

/** Tables holding costs, sell prices, margins, overrides, payments or admin notes. */
const ADMIN_ONLY_TABLES = [
  "product_variants",
  "customer_private",
  "customer_category_margins",
  "customer_price_overrides",
  "orders",
  "order_items",
  "supplier_orders",
  "delivery_proofs",
  "customer_payments",
  "supplier_payments",
  "settings",
  "suppliers",
  "email_log",
  "audit_log",
];

/** Never readable by any API role at all. */
const SYSTEM_TABLES = ["counters", "rate_limits"];

async function rowsOrDenied(actor: Actor, sql: string, params?: unknown[]): Promise<number | string> {
  return as(db, actor, async (q) => {
    try {
      return (await q(sql, params)).length;
    } catch (e) {
      return (e as { code?: string }).code ?? "error";
    }
  });
}

describe("anonymous visitor", () => {
  it.each(ADMIN_ONLY_TABLES.concat(SYSTEM_TABLES, ["profiles", "customers", "invoices", "notifications",
    "customer_category_access", "customer_product_rules"]))("cannot read %s", async (table) => {
    expect(await rowsOrDenied("anon", `select * from public.${table}`)).toBe(DENIED);
  });

  it("cannot read cost through any column of the base variants table", async () => {
    expect(await rowsOrDenied("anon", "select cost_pence from public.product_variants")).toBe(DENIED);
  });

  it.each(["shop_settings", "my_supplier", "customer_orders", "customer_order_items", "customer_deliveries",
    "customer_payment_history", "supplier_order_list", "supplier_order_lines"])(
    "cannot read the signed-in view %s", async (view) => {
      expect(await rowsOrDenied("anon", `select * from public.${view}`)).toBe(DENIED);
    });

  it("CAN browse active categories, products and sizes (positive control)", async () => {
    await as(db, "anon", async (q) => {
      expect((await q("select * from public.categories")).length).toBeGreaterThan(0);
      expect((await q("select * from public.products")).length).toBeGreaterThan(0);
      expect((await q("select * from public.catalogue_variants")).length).toBeGreaterThan(0);
    });
  });

  it("the public catalogue view exposes no cost, price or supplier column", async () => {
    const cols = await as(db, "anon", (q) =>
      q<{ column_name: string }>(
        "select column_name from information_schema.columns where table_schema='public' and table_name='catalogue_variants'"));
    const names = cols.map((c) => c.column_name);
    expect(names).toEqual(expect.arrayContaining(["id", "product_id", "size_label"]));
    for (const forbidden of ["cost_pence", "supplier_id", "price_pence", "unit_price_pence"]) {
      expect(names).not.toContain(forbidden);
    }
  });

  it("cannot see inactive products", async () => {
    await asOwner(db, async (q) => {
      await q("update public.products set active = false where slug = 'mango-drink'");
      await q("set local role anon");
      await q(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
      expect(await q("select * from public.products where slug = 'mango-drink'")).toHaveLength(0);
      expect(await q("select * from public.catalogue_variants where id = $1", [IDS.variants.mango])).toHaveLength(0);
    });
  });

  it.each([
    ["insert into public.categories (name, slug) values ('x', 'x')"],
    ["update public.products set name = 'hacked'"],
    ["insert into public.customers (business_name) values ('x')"],
    ["insert into public.customer_price_overrides (customer_id, variant_id, price_pence) values ('20000000-0000-4000-a000-000000000001', '50000000-0000-4000-a000-000000000001', 1)"],
  ])("cannot write: %s", async (sql) => {
    expect(await as(db, "anon", (q) => outcome(q(sql)))).toBe(DENIED);
  });

  it.each([
    ["select public.hit_rate_limit('x', 1, 60)"],
    ["select public.create_order_tx('{}'::jsonb)"],
    ["select public.promote_to_admin('restaurant.a@example.com')"],
    ["select public.next_counter('invoice')"],
  ])("cannot call privileged function: %s", async (sql) => {
    expect(await as(db, "anon", (q) => outcome(q(sql)))).toBe(DENIED);
  });
});

describe("signed-in non-admins see no row of any admin-only table", () => {
  for (const actor of SIGNED_IN_NON_ADMINS) {
    it.each(ADMIN_ONLY_TABLES)(`${actor} reads 0 rows from %s`, async (table) => {
      expect(await rowsOrDenied(actor, `select * from public.${table}`)).toBe(0);
    });
    it.each(SYSTEM_TABLES)(`${actor} is denied %s`, async (table) => {
      expect(await rowsOrDenied(actor, `select * from public.${table}`)).toBe(DENIED);
    });
  }
});

describe("signed-in non-admins cannot write prices, payments, orders or approvals", () => {
  const writes: [string, string][] = [
    ["set a cost", `update public.product_variants set cost_pence = 1 where id = '${IDS.variants.rice5}' returning id`],
    ["set a price override", `insert into public.customer_price_overrides (customer_id, variant_id, price_pence) values ('${IDS.customers.A}', '${IDS.variants.rice5}', 1) returning customer_id`],
    ["set a category margin", `insert into public.customer_category_margins (customer_id, category_id, margin_bp) values ('${IDS.customers.A}', '${IDS.categories.rice}', -9000) returning customer_id`],
    ["record a customer payment", `insert into public.customer_payments (order_id, customer_id, amount_pence, paid_on) select id, customer_id, 999999, current_date from public.orders limit 1 returning id`],
    ["record a supplier payment", `insert into public.supplier_payments (supplier_order_id, supplier_id, amount_pence, paid_on) select id, supplier_id, 1, current_date from public.supplier_orders limit 1 returning id`],
    ["edit an order", "update public.orders set total_pence = 0 returning id"],
    ["edit an order line", "update public.order_items set qty = 999 returning id"],
    ["mark a supplier order delivered", "update public.supplier_orders set status = 'delivered' returning id"],
    ["change settings", "update public.settings set min_order_pence = 0 returning id"],
    ["change the global margin", "update public.settings set global_margin_bp = 0 returning id"],
    ["delete audit history", "delete from public.audit_log returning id"],
    ["write audit history", "insert into public.audit_log (action, entity) values ('x', 'y') returning id"],
    ["create a category", "insert into public.categories (name, slug) values ('x', 'zz-x') returning id"],
    ["approve another customer", `update public.customers set status = 'approved' where id = '${IDS.customers.pending}' returning id`],
  ];
  for (const actor of SIGNED_IN_NON_ADMINS) {
    it.each(writes)(`${actor} cannot %s`, async (_label, sql) => {
      const result = await as(db, actor, async (q) => {
        try {
          return (await q(sql)).length === 0 ? "no rows affected" : "WROTE";
        } catch (e) {
          return (e as { code?: string }).code === DENIED ? "denied" : `error ${(e as { code?: string }).code}`;
        }
      });
      expect(["denied", "no rows affected"]).toContain(result);
    });
  }
});

describe("customer A", () => {
  it("sees only its own profile and customer record", async () => {
    await as(db, "customerA", async (q) => {
      const profiles = await q<{ id: string }>("select id from public.profiles");
      expect(profiles.map((p) => p.id)).toEqual([IDS.users.customerA]);
      const customers = await q<{ id: string }>("select id from public.customers");
      expect(customers.map((c) => c.id)).toEqual([IDS.customers.A]);
    });
  });

  it("cannot make itself an admin or relink itself to another customer or supplier", async () => {
    for (const set of ["role = 'admin'", `customer_id = '${IDS.customers.B}'`, `supplier_id = '${IDS.suppliers.A}'`, "active = false", "email = 'x@example.com'"]) {
      const r = await as(db, "customerA", (q) => outcome(q(`update public.profiles set ${set} where id = '${IDS.users.customerA}'`)));
      expect(r, set).toBe(DENIED);
    }
  });

  it("CAN update its own name and phone (positive control)", async () => {
    await as(db, "customerA", async (q) => {
      const rows = await q(`update public.profiles set full_name = 'Asha', phone = '07000' where id = '${IDS.users.customerA}' returning id`);
      expect(rows).toHaveLength(1);
    });
  });

  it("cannot change its own approval status", async () => {
    const r = await as(db, "customerA", (q) => outcome(q(`update public.customers set status = 'suspended' where id = '${IDS.customers.A}'`)));
    expect(r).toBe(DENIED);
  });

  it("cannot update customer B or B's profile", async () => {
    await as(db, "customerA", async (q) => {
      expect(await q(`update public.customers set business_name = 'x' where id = '${IDS.customers.B}' returning id`)).toHaveLength(0);
      expect(await q(`update public.profiles set full_name = 'x' where id = '${IDS.users.customerB}' returning id`)).toHaveLength(0);
    });
  });

  it("sees only its own orders, lines, deliveries, payments and invoices", async () => {
    await as(db, "customerA", async (q) => {
      const orders = await q<{ id: string; number: string }>("select * from public.customer_orders");
      expect(orders).toHaveLength(1);
      expect(orders[0].number).toBe("1001");
      const items = await q<{ order_id: string }>("select * from public.customer_order_items");
      expect(items.length).toBe(2);
      expect(new Set(items.map((i) => i.order_id))).toEqual(new Set([orders[0].id]));
      expect(await q("select * from public.customer_deliveries")).toHaveLength(2);
      expect(await q("select * from public.customer_payment_history")).toHaveLength(1);
      const invoices = await q<{ customer_id: string }>("select * from public.invoices");
      expect(invoices.map((i) => i.customer_id)).toEqual([IDS.customers.A]);
    });
  });

  it("order lines expose the agreed sell price but never the cost or supplier", async () => {
    await as(db, "customerA", async (q) => {
      const items = await q("select * from public.customer_order_items order by sort");
      const mango = items.find((i) => i.product_name === "Mango Drink")!;
      expect(mango.unit_price_pence).toBe("1700");
      for (const item of items) {
        expect(Object.keys(item)).not.toContain("unit_cost_pence");
        expect(Object.keys(item)).not.toContain("supplier_id");
      }
      expect(await outcome(q("select unit_cost_pence from public.customer_order_items"))).toBe("42703");
    });
  });

  it("customer orders view hides admin chase fields", async () => {
    const cols = await as(db, "customerA", (q) =>
      q<{ column_name: string }>("select column_name from information_schema.columns where table_schema='public' and table_name='customer_orders'"));
    const names = cols.map((c) => c.column_name);
    expect(names).not.toContain("next_chase_date");
    expect(names).not.toContain("payment_notes");
  });

  it("cannot see B's order even when asking for it by id", async () => {
    const bOrderId = await asOwner(db, async (q) =>
      (await q<{ id: string }>(`select id from public.orders where customer_id = '${IDS.customers.B}'`))[0].id);
    await as(db, "customerA", async (q) => {
      expect(await q("select * from public.customer_orders where id = $1", [bOrderId])).toHaveLength(0);
      expect(await q("select * from public.customer_order_items where order_id = $1", [bOrderId])).toHaveLength(0);
      expect(await q("select * from public.invoices where order_id = $1", [bOrderId])).toHaveLength(0);
    });
  });

  it("cannot read its own margins or override table directly", async () => {
    await as(db, "customerA", async (q) => {
      expect(await q("select * from public.customer_price_overrides")).toHaveLength(0);
      expect(await q("select * from public.customer_category_margins")).toHaveLength(0);
      expect(await q("select * from public.customer_private")).toHaveLength(0);
    });
  });

  it("sees no supplier view rows and gets bank details only as an approved customer", async () => {
    await as(db, "customerA", async (q) => {
      expect(await q("select * from public.supplier_order_list")).toHaveLength(0);
      expect(await q("select * from public.supplier_order_lines")).toHaveLength(0);
      expect(await q("select * from public.my_supplier")).toHaveLength(0);
      expect(await q("select * from public.shop_settings")).toHaveLength(1);
    });
  });

  it("sees only its own category set", async () => {
    await as(db, "customerA", async (q) => {
      const rows = await q<{ customer_id: string }>("select * from public.customer_category_access");
      expect(rows.length).toBe(3);
      expect(new Set(rows.map((r) => r.customer_id))).toEqual(new Set([IDS.customers.A]));
    });
  });
});

describe("customer B", () => {
  it("sees only its own order and never A's agreed prices", async () => {
    await as(db, "customerB", async (q) => {
      const orders = await q<{ number: string }>("select * from public.customer_orders");
      expect(orders.map((o) => o.number)).toEqual(["1002"]);
      const items = await q<{ unit_price_pence: string }>("select * from public.customer_order_items");
      expect(items.map((i) => i.unit_price_pence)).toEqual(["1440"]);
      expect(await q("select * from public.customer_payment_history")).toHaveLength(0);
      expect(await q(`select * from public.customers where id = '${IDS.customers.A}'`)).toHaveLength(0);
      expect(await q(`select * from public.customer_category_access where customer_id = '${IDS.customers.A}'`)).toHaveLength(0);
    });
  });
});

describe("unapproved (pending) customer", () => {
  it("can read its own customer record to see its status", async () => {
    await as(db, "pending", async (q) => {
      const rows = await q<{ status: string }>("select status from public.customers");
      expect(rows).toEqual([{ status: "pending" }]);
    });
  });

  it("cannot approve itself", async () => {
    const r = await as(db, "pending", (q) => outcome(q(`update public.customers set status = 'approved' where id = '${IDS.customers.pending}'`)));
    expect(r).toBe(DENIED);
  });

  it("gets nothing priced, even for an order that exists on its account", async () => {
    await asOwner(db, async (q) => {
      // Arrange: an order on the pending customer's account (e.g. placed before suspension).
      await q(`update public.customers set status = 'approved' where id = '${IDS.customers.pending}'`);
      await q(`select public.create_order_tx($1::jsonb)`, [JSON.stringify({
        customer_id: IDS.customers.pending, placed_by: IDS.users.pending, delivery_date: "2026-10-10",
        payment_terms: "on_delivery",
        totals: { goods_net_pence: 1440, goods_vat_pence: 0, delivery_net_pence: 1200, delivery_vat_pence: 0, vat_pence: 0, total_pence: 2640 },
        supplier_orders: [{ supplier_id: IDS.suppliers.A, items: [{ variant_id: IDS.variants.rice5, product_name: "Rice", size_label: "5 kg", qty: 1, unit_price_pence: 1440, unit_cost_pence: 1200, vat_rate_bp: 0, line_net_pence: 1440, line_vat_pence: 0 }] }],
      })]);
      await q(`update public.customers set status = 'pending' where id = '${IDS.customers.pending}'`);
      await q("set local role authenticated");
      await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: IDS.users.pending, role: "authenticated" })]);
      for (const view of ["customer_orders", "customer_order_items", "customer_deliveries", "customer_payment_history", "invoices", "shop_settings", "customer_category_access"]) {
        expect(await q(`select * from public.${view}`), view).toHaveLength(0);
      }
    });
  });
});

describe("supplier A", () => {
  it("sees only its own supplier orders (A's rice and B's rice, not A's drinks)", async () => {
    await as(db, "supplierA", async (q) => {
      const list = await q<{ order_number: string; customer_name: string }>("select * from public.supplier_order_list order by order_number");
      expect(list.map((r) => r.order_number)).toEqual(["1001", "1002"]);
      const lines = await q<{ product_name: string }>("select * from public.supplier_order_lines");
      expect(lines.map((l) => l.product_name).sort()).toEqual(["Basant Basmati Rice", "Basant Basmati Rice"]);
      expect(await q("select * from public.my_supplier")).toHaveLength(1);
    });
  });

  it("supplier views expose no sell price, cost or margin", async () => {
    const cols = await as(db, "supplierA", (q) =>
      q<{ table_name: string; column_name: string }>(
        "select table_name, column_name from information_schema.columns where table_schema='public' and table_name in ('supplier_order_list','supplier_order_lines','my_supplier')"));
    expect(cols.length).toBeGreaterThan(10);
    for (const c of cols) expect(c.column_name).not.toMatch(/price|cost|margin|total|vat|net/);
    expect(await as(db, "supplierA", (q) => outcome(q("select unit_price_pence from public.supplier_order_lines")))).toBe("42703");
  });

  it("cannot read customer records, other suppliers, or admin notes", async () => {
    await as(db, "supplierA", async (q) => {
      expect(await q("select * from public.customers")).toHaveLength(0);
      expect(await q("select * from public.suppliers")).toHaveLength(0);
      const mine = await q("select * from public.my_supplier");
      expect(Object.keys(mine[0])).not.toContain("notes");
    });
  });

  it("sees nothing from customer views", async () => {
    await as(db, "supplierA", async (q) => {
      for (const view of ["customer_orders", "customer_order_items", "customer_payment_history", "invoices", "shop_settings"]) {
        expect(await q(`select * from public.${view}`), view).toHaveLength(0);
      }
    });
  });
});

describe("supplier B", () => {
  it("sees only the drinks part of order 1001", async () => {
    await as(db, "supplierB", async (q) => {
      const list = await q<{ order_number: string }>("select * from public.supplier_order_list");
      expect(list.map((r) => r.order_number)).toEqual(["1001"]);
      const lines = await q<{ product_name: string }>("select * from public.supplier_order_lines");
      expect(lines.map((l) => l.product_name)).toEqual(["Mango Drink"]);
    });
  });

  it("loses access when deactivated", async () => {
    await asOwner(db, async (q) => {
      await q(`update public.profiles set active = false where id = '${IDS.users.supplierB}'`);
      await q("set local role authenticated");
      await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: IDS.users.supplierB, role: "authenticated" })]);
      expect(await q("select * from public.supplier_order_list")).toHaveLength(0);
    });
  });
});

describe("admin", () => {
  it("can read costs, margins, overrides, payments and every order", async () => {
    // Compared with the owner's view: E2E runs add their own customers, prices and logins.
    const count = async (t: string) => Number((await asOwner(db, (q) => q<{ n: string }>(`select count(*) as n from public.${t}`)))[0].n);
    const [allProfiles, allOverrides, allMargins] = [await count("profiles"), await count("customer_price_overrides"), await count("customer_category_margins")];
    expect(allOverrides).toBeGreaterThan(0);
    expect(allMargins).toBeGreaterThan(0);
    await as(db, "admin", async (q) => {
      expect((await q("select cost_pence from public.product_variants where cost_pence is not null")).length).toBeGreaterThan(0);
      expect(await q("select * from public.customer_price_overrides")).toHaveLength(allOverrides);
      expect(await q("select * from public.customer_category_margins")).toHaveLength(allMargins);
      expect(await q("select * from public.orders")).toHaveLength(2);
      expect(await q("select * from public.customer_payments")).toHaveLength(1);
      expect(await q("select * from public.supplier_payments")).toHaveLength(1);
      expect((await q("select * from public.profiles")).length).toBe(allProfiles);
    });
  });

  it("can change a price, and the change is audited with the admin as actor", async () => {
    await as(db, "admin", async (q) => {
      await q(`update public.product_variants set cost_pence = 1300 where id = '${IDS.variants.rice5}'`);
      const audit = await q<{ actor_id: string; before: { cost_pence: number }; after: { cost_pence: number } }>(
        "select actor_id, before, after from public.audit_log where entity = 'product_variants' and entity_id = $1 order by id desc limit 1",
        [IDS.variants.rice5]);
      expect(audit[0].actor_id).toBe(IDS.users.admin);
      expect(audit[0].before.cost_pence).toBe(1200);
      expect(audit[0].after.cost_pence).toBe(1300);
    });
  });

  it("can approve a customer and change roles", async () => {
    await as(db, "admin", async (q) => {
      expect(await q(`update public.customers set status = 'approved' where id = '${IDS.customers.pending}' returning id`)).toHaveLength(1);
      expect(await q(`update public.profiles set role = 'admin', customer_id = null where id = '${IDS.users.customerB}' returning id`)).toHaveLength(1);
    });
  });

  it("cannot rewrite or delete the audit log", async () => {
    for (const sql of ["delete from public.audit_log", "update public.audit_log set action = 'x'",
      "insert into public.audit_log (action, entity) values ('x','y')"]) {
      expect(await as(db, "admin", (q) => outcome(q(sql))), sql).toBe(DENIED);
    }
  });

  it("cannot call service-only functions through the API role", async () => {
    for (const sql of ["select public.create_order_tx('{}'::jsonb)", "select public.promote_to_admin('x@example.com')",
      "select public.hit_rate_limit('x', 1, 60)"]) {
      expect(await as(db, "admin", (q) => outcome(q(sql))), sql).toBe(DENIED);
    }
  });

  it("a deactivated admin has no admin powers", async () => {
    await asOwner(db, async (q) => {
      await q(`update public.profiles set active = false where id = '${IDS.users.admin}'`);
      await q("set local role authenticated");
      await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: IDS.users.admin, role: "authenticated" })]);
      expect(await q("select * from public.product_variants")).toHaveLength(0);
      expect(await q("select * from public.orders")).toHaveLength(0);
    });
  });
});

describe("account provisioning ignores user-supplied metadata for authorisation", () => {
  it("a signup claiming role=admin and another customer's id becomes a plain pending customer", async () => {
    await asOwner(db, async (q) => {
      const id = "90000000-0000-4000-a000-000000000001";
      await q(
        `insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
         values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', 'attacker@example.com', $2::jsonb, '{}'::jsonb)`,
        [id, JSON.stringify({ role: "admin", customer_id: IDS.customers.A, supplier_id: IDS.suppliers.A, business_name: "Attacker Ltd" })],
      );
      const [p] = await q<{ role: string; customer_id: string; supplier_id: string | null }>(
        "select role, customer_id, supplier_id from public.profiles where id = $1", [id]);
      expect(p.role).toBe("customer");
      expect(p.supplier_id).toBeNull();
      expect(p.customer_id).not.toBe(IDS.customers.A);
      const [c] = await q<{ status: string; business_name: string }>("select status, business_name from public.customers where id = $1", [p.customer_id]);
      expect(c).toEqual({ status: "pending", business_name: "Attacker Ltd" });
    });
  });

  it("app_metadata role claims in the JWT grant nothing", async () => {
    await asOwner(db, async (q) => {
      await q("set local role authenticated");
      await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({
        sub: IDS.users.customerA, role: "authenticated", app_metadata: { role: "admin" }, user_metadata: { role: "admin" } })]);
      expect(await q("select * from public.product_variants")).toHaveLength(0);
      expect((await q<{ is_admin: boolean }>("select public.is_admin()"))[0].is_admin).toBe(false);
    });
  });
});

describe("driver tokens at rest", () => {
  it("only a SHA-256 hash is stored, and audit rows never contain it", async () => {
    await asOwner(db, async (q) => {
      const [row] = await q<{ len: number }>("select octet_length(token_hash) as len from public.delivery_proofs limit 1");
      expect(row.len).toBe(32);
      const leaked = await q("select 1 from public.audit_log where entity = 'delivery_proofs' and (after ? 'token_hash' or before ? 'token_hash')");
      expect(leaked).toHaveLength(0);
    });
  });
});

describe("rate limiter", () => {
  it("allows up to the limit in a window, then refuses", async () => {
    await asOwner(db, async (q) => {
      await q("set local role service_role");
      const results: boolean[] = [];
      for (let i = 0; i < 4; i++) {
        results.push((await q<{ ok: boolean }>("select public.hit_rate_limit('test:key', 3, 60) as ok"))[0].ok);
      }
      expect(results).toEqual([true, true, true, false]);
    });
  });
});

describe("order creation transaction", () => {
  it("rejects totals that do not add up and leaves no partial order or used number", async () => {
    const result = await asOwner(db, async (q) => {
      await q("savepoint s");
      const err = await outcome(q("select public.create_order_tx($1::jsonb)", [JSON.stringify({
        customer_id: IDS.customers.A, placed_by: IDS.users.customerA, delivery_date: "2026-10-10", payment_terms: "on_delivery",
        totals: { goods_net_pence: 1, goods_vat_pence: 0, delivery_net_pence: 0, delivery_vat_pence: 0, vat_pence: 0, total_pence: 1 },
        supplier_orders: [{ supplier_id: IDS.suppliers.A, items: [{ variant_id: IDS.variants.rice5, product_name: "Rice", size_label: "5 kg", qty: 1, unit_price_pence: 1440, vat_rate_bp: 0, line_net_pence: 1440, line_vat_pence: 0 }] }],
      })]));
      await q("rollback to savepoint s");
      const counter = await q<{ value: string }>("select value from public.counters where name = 'order'");
      const orders = await q("select 1 from public.orders");
      return { err, counter: counter[0].value, orders: orders.length };
    });
    expect(result.err).toBe("P0001");
    expect(result.counter).toBe("1002");
    expect(result.orders).toBe(2);
  });

  it("refuses orders for customers who are not approved", async () => {
    const err = await asOwner(db, (q) => outcome(q("select public.create_order_tx($1::jsonb)", [JSON.stringify({
      customer_id: IDS.customers.pending, delivery_date: "2026-10-10",
      totals: {}, supplier_orders: [],
    })])));
    expect(err).toBe("P0001");
  });

  it("allocates consecutive order and invoice numbers", async () => {
    await asOwner(db, async (q) => {
      const payload = {
        customer_id: IDS.customers.B, placed_by: IDS.users.customerB, delivery_date: "2026-10-10", payment_terms: "on_delivery",
        totals: { goods_net_pence: 1440, goods_vat_pence: 0, delivery_net_pence: 1200, delivery_vat_pence: 0, vat_pence: 0, total_pence: 2640 },
        supplier_orders: [{ supplier_id: IDS.suppliers.A, items: [{ variant_id: IDS.variants.rice5, product_name: "Rice", size_label: "5 kg", qty: 1, unit_price_pence: 1440, unit_cost_pence: 1200, vat_rate_bp: 0, line_net_pence: 1440, line_vat_pence: 0 }] }],
      };
      const a = (await q<{ r: { number: number; invoice_number: number } }>("select public.create_order_tx($1::jsonb) as r", [JSON.stringify(payload)]))[0].r;
      const b = (await q<{ r: { number: number; invoice_number: number } }>("select public.create_order_tx($1::jsonb) as r", [JSON.stringify(payload)]))[0].r;
      expect([a.number, b.number]).toEqual([1003, 1004]);
      expect([a.invoice_number, b.invoice_number]).toEqual([3, 4]);
    });
  });
});

describe("every non-admin role", () => {
  it.each(NON_ADMINS)("%s cannot list another user's notifications", async (actor) => {
    const r = await rowsOrDenied(actor, `select * from public.notifications where user_id <> '${actor === "anon" ? IDS.users.admin : IDS.users[actor]}'`);
    expect([0, DENIED]).toContain(r);
  });
});

describe("catalogue (Phase 3)", () => {
  /** Arrange as owner, then query as `actor`, in one rolled-back transaction. */
  async function arranged(actor: Actor, arrange: string, sql: string) {
    await db.query("begin");
    try {
      await db.query(arrange);
      if (actor === "anon") {
        await db.query("set local role anon");
        await db.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
      } else {
        await db.query("set local role authenticated");
        await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: IDS.users[actor], role: "authenticated" })]);
      }
      return (await db.query(sql)).rows;
    } finally {
      await db.query("rollback");
    }
  }

  it.each(NON_ADMINS)("%s cannot read the admin product list (needs-price counts, suppliers)", async (actor) => {
    expect(await rowsOrDenied(actor, "select * from public.admin_product_list")).toBe(actor === "anon" ? DENIED : 0);
  });

  it("admin reads the admin product list with needs-price counts (positive control)", async () => {
    const rows = await as(db, "admin", (q) => q<{ name: string; needs_price_count: number }>("select name, needs_price_count from public.admin_product_list"));
    const owner = await asOwner(db, (q) => q<{ n: number }>("select count(*)::int as n from public.products"));
    expect(rows.length).toBe(owner[0].n);
  });

  it.each(["anon", "customerA", "supplierA"] as Actor[])("%s cannot see products of a hidden category, or their sizes", async (actor) => {
    const hide = `update public.categories set active = false where id = '${IDS.categories.rice}'`;
    const products = await arranged(actor, hide, `select id from public.products where category_id = '${IDS.categories.rice}'`);
    expect(products).toEqual([]);
    const sizes = await arranged(actor, hide, `select id from public.catalogue_variants where id = '${IDS.variants.rice5}'`);
    expect(sizes).toEqual([]);
  });

  it.each(["anon", "customerA"] as Actor[])("%s cannot see a hidden product", async (actor) => {
    const rows = await arranged(actor, "update public.products set active = false where name = 'Basant Basmati Rice'", "select id from public.products where name = 'Basant Basmati Rice'");
    expect(rows).toEqual([]);
  });

  it("admin still sees hidden categories and products (positive control)", async () => {
    const rows = await arranged("admin", `update public.categories set active = false where id = '${IDS.categories.rice}'`, `select id from public.products where category_id = '${IDS.categories.rice}'`);
    expect(rows.length).toBeGreaterThan(0);
  });

  it.each(SIGNED_IN_NON_ADMINS)("%s cannot change a category's default VAT, rename a product or add a size", async (actor) => {
    expect(await rowsOrDenied(actor, `update public.categories set default_vat_rate_bp = 0 where id = '${IDS.categories.rice}' returning id`)).toBe(0);
    expect(await rowsOrDenied(actor, "update public.products set name = 'x' returning id")).toBe(0);
    expect(await rowsOrDenied(actor, `insert into public.product_variants (product_id, size_label) select id, 'x' from public.products limit 1 returning id`)).toBe(DENIED);
  });

  it("the import key of sizes is not exposed through the public sizes view", async () => {
    const cols = await as(db, "anon", (q) => q<{ column_name: string }>("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'catalogue_variants'"));
    expect(cols.map((c) => c.column_name).sort()).toEqual(["id", "image_path", "product_id", "size_label", "size_sort", "sku", "vat_rate_bp"]);
  });

  it.each(SIGNED_IN_NON_ADMINS)("%s cannot upload into or delete from the product-images bucket", async (actor) => {
    expect(
      await rowsOrDenied(actor, "insert into storage.objects (bucket_id, name, owner_id) values ('product-images', 'products/x/evil.png', null) returning id"),
    ).toBe(DENIED);
    // Either refused outright or matches nothing; never deletes.
    expect([0, DENIED]).toContain(await rowsOrDenied(actor, "delete from storage.objects where bucket_id = 'product-images' returning id"));
  });

  it("anon cannot upload into the product-images bucket", async () => {
    expect(await rowsOrDenied("anon", "insert into storage.objects (bucket_id, name) values ('product-images', 'products/x/evil.png') returning id")).toBe(DENIED);
  });
});

describe("approvals and per-customer pricing (Phase 4)", () => {
  const A = IDS.customers.A;
  const writes: Array<[string, string]> = [
    ["grant itself a category", `insert into public.customer_category_access (customer_id, category_id) select '${A}', id from public.categories where slug = 'food-colours' returning customer_id`],
    ["add an always-show rule", `insert into public.customer_product_rules (customer_id, product_id, mode) select '${A}', id, 'allow' from public.products where name = 'Green Cardamom' returning customer_id`],
    ["set a category margin", `insert into public.customer_category_margins (customer_id, category_id, margin_bp) select '${A}', id, -5000 from public.categories where slug = 'food-colours' returning customer_id`],
    ["set a fixed price", `insert into public.customer_price_overrides (customer_id, variant_id, price_pence) values ('${A}', '${IDS.variants.rice5}', 1) returning customer_id`],
    ["write a default margin", `insert into public.customer_private (customer_id, default_margin_bp) values ('${A}', -9000) on conflict (customer_id) do update set default_margin_bp = -9000 returning customer_id`],
    ["queue an email", `insert into public.email_log (to_email, template, subject) values ('x@example.com', 'account_approved', 'x') returning id`],
  ];
  it.each(SIGNED_IN_NON_ADMINS.flatMap((actor) => writes.map(([what, sql]) => [actor, what, sql] as const)))("%s cannot %s", async (actor, _what, sql) => {
    expect(await rowsOrDenied(actor, sql)).toBe(DENIED);
  });

  it.each(SIGNED_IN_NON_ADMINS)("%s cannot change the global margin or remove a category grant", async (actor) => {
    expect(await rowsOrDenied(actor, "update public.settings set global_margin_bp = 0 returning id")).toBe(0);
    expect([0, DENIED]).toContain(await rowsOrDenied(actor, `delete from public.customer_category_access where customer_id = '${A}' returning customer_id`));
  });

  it.each(["customerA", "customerB", "pending"] as Actor[])("%s cannot approve, reject or reactivate any account", async (actor) => {
    for (const id of [IDS.customers.A, IDS.customers.B, IDS.customers.pending]) {
      // Always a real change: approved -> suspended, anything else -> approved.
      const r = await rowsOrDenied(
        actor,
        `update public.customers set status = (case when status = 'approved' then 'suspended' else 'approved' end)::public.customer_status where id = '${id}' returning id`,
      );
      expect([0, DENIED]).toContain(r);
    }
  });

  it("customer A reads its own categories and product rules, and nobody else's (positive control)", async () => {
    await as(db, "customerA", async (q) => {
      const access = await q<{ customer_id: string }>("select customer_id from public.customer_category_access");
      expect(access.length).toBeGreaterThan(0);
      expect(access.every((r) => r.customer_id === A)).toBe(true);
      const rules = await q<{ customer_id: string }>("select customer_id from public.customer_product_rules");
      expect(rules.every((r) => r.customer_id === A)).toBe(true);
    });
  });

  it("admin can do all of it (positive control)", async () => {
    await as(db, "admin", async (q) => {
      for (const [, sql] of writes) expect((await q(sql)).length).toBe(1);
    });
  });
});

describe("basket and order placement (Phase 5)", () => {
  const A = IDS.customers.A;
  const B = IDS.customers.B;
  const add = (customer: string, qty = 1) =>
    `insert into public.basket_items (customer_id, variant_id, qty) values ('${customer}', '${IDS.variants.rice5}', ${qty}) returning customer_id`;

  it("customer A keeps its own basket (positive control) and sees only its own rows", async () => {
    await as(db, "customerA", async (q) => {
      expect((await q(add(A, 3))).length).toBe(1);
      expect((await q(`update public.basket_items set qty = 4 where customer_id = '${A}' returning qty`)).length).toBe(1);
      const rows = await q<{ customer_id: string }>("select customer_id from public.basket_items");
      expect(rows.length).toBe(1);
      expect(rows.every((r) => r.customer_id === A)).toBe(true);
      expect((await q(`delete from public.basket_items where customer_id = '${A}' returning customer_id`)).length).toBe(1);
    });
  });

  it.each(NON_ADMINS.filter((a) => a !== "customerB"))("%s cannot put anything in restaurant B's basket", async (actor) => {
    expect(await rowsOrDenied(actor, add(B))).toBe(DENIED);
  });

  it.each(["anon", "pending", "supplierA", "supplierB", "admin"] as Actor[])("%s cannot keep a basket (only approved restaurants can)", async (actor) => {
    const own = actor === "pending" ? IDS.customers.pending : A;
    expect(await rowsOrDenied(actor, add(own))).toBe(DENIED);
  });

  it.each(SIGNED_IN_NON_ADMINS)("%s cannot read, change or empty another restaurant's basket", async (actor) => {
    const result = await asOwner(db, async (q) => {
      await q(`insert into public.basket_items (customer_id, variant_id, qty) values ('${B}', '${IDS.variants.mango}', 2)`);
      // Switch to the actor inside the same transaction so the row exists for the attempt.
      await q("set local role authenticated");
      await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: IDS.users[actor as keyof typeof IDS.users], role: "authenticated" })]);
      const seen = (await q(`select 1 from public.basket_items where customer_id = '${B}'`)).length;
      const changed = (await q(`update public.basket_items set qty = 99 where customer_id = '${B}' returning 1`)).length;
      const removed = (await q(`delete from public.basket_items where customer_id = '${B}' returning 1`)).length;
      return { seen, changed, removed };
    });
    if (actor === "customerB") expect(result).toEqual({ seen: 1, changed: 1, removed: 1 });
    else expect(result).toEqual({ seen: 0, changed: 0, removed: 0 });
  });

  it("quantities are whole numbers from 1 to 9,999", async () => {
    for (const qty of [0, -1, 10000]) expect(await as(db, "customerA", (q) => outcome(q(add(A, qty))))).toBe("23514");
  });

  it.each(NON_ADMINS)("%s cannot call create_order_tx (server only)", async (actor) => {
    const r = await as(db, actor, (q) => outcome(q("select public.create_order_tx('{}'::jsonb)")));
    expect(r).toBe(DENIED);
  });

  it("customers cannot see the checkout key of their orders", async () => {
    const cols = await as(db, "customerA", (q) =>
      q<{ column_name: string }>("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'customer_orders'"),
    );
    expect(cols.map((c) => c.column_name)).not.toContain("checkout_key");
  });

  const payload = (key: string | null, supplier: string = IDS.suppliers.A) => ({
    customer_id: B, placed_by: IDS.users.customerB, checkout_key: key, delivery_date: "2026-10-10", payment_terms: "within_7_days", promised_pay_date: "2026-10-17",
    totals: { goods_net_pence: 1440, goods_vat_pence: 0, delivery_net_pence: 1200, delivery_vat_pence: 0, vat_pence: 0, total_pence: 2640 },
    supplier_orders: [{ supplier_id: supplier, items: [{ variant_id: IDS.variants.rice5, product_name: "Rice", size_label: "5 kg", qty: 1, unit_price_pence: 1440, unit_cost_pence: 1200, vat_rate_bp: 0, line_net_pence: 1440, line_vat_pence: 0 }] }],
  });

  it("the same checkout submitted twice places one order", async () => {
    await asOwner(db, async (q) => {
      const key = "9f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f";
      const before = (await q<{ n: number }>("select count(*)::int n from public.orders"))[0].n;
      const a = (await q<{ r: { order_id: string; existing: boolean } }>("select public.create_order_tx($1::jsonb) r", [JSON.stringify(payload(key))]))[0].r;
      const b = (await q<{ r: { order_id: string; existing: boolean } }>("select public.create_order_tx($1::jsonb) r", [JSON.stringify(payload(key))]))[0].r;
      expect(b.order_id).toBe(a.order_id);
      expect([a.existing, b.existing]).toEqual([false, true]);
      expect((await q<{ n: number }>("select count(*)::int n from public.orders"))[0].n).toBe(before + 1);
    });
  });

  it("refuses lines from an inactive supplier", async () => {
    const err = await asOwner(db, async (q) => {
      await q(`update public.suppliers set active = false where id = '${IDS.suppliers.A}'`);
      return outcome(q("select public.create_order_tx($1::jsonb)", [JSON.stringify(payload(null))]));
    });
    expect(err).toBe("P0001");
  });

  it("tells each supplier's own logins, and queues the supplier and restaurant emails", async () => {
    await asOwner(db, async (q) => {
      const r = (await q<{ r: { order_id: string; number: number } }>("select public.create_order_tx($1::jsonb) r", [JSON.stringify(payload(null))]))[0].r;
      const notes = await q<{ user_id: string; link: string }>("select user_id, link from public.notifications where title = $1", [`New order ORDER-${r.number}`]);
      expect(notes.map((n) => n.user_id)).toEqual([IDS.users.supplierA]);
      expect(notes[0].link).toMatch(/^\/supplier\/orders\/[0-9a-f-]{36}$/);
      const mail = await q<{ to_email: string; template: string }>(
        "select to_email, template from public.email_log where entity_id in (select id::text from public.supplier_orders where order_id = $1 union select $1::text) order by template",
        [r.order_id],
      );
      expect(mail).toEqual([
        { to_email: "restaurant.b@example.com", template: "order_confirmation" },
        { to_email: "supplier.a@example.com", template: "supplier_order_new" },
      ]);
    });
  });
});

describe("supplier orders and proof of delivery (Phase 6)", () => {
  const hash = (n: number) => `'\\x${n.toString(16).padStart(2, "0").repeat(32)}'::bytea`;
  async function order(q: Parameters<Parameters<typeof asOwner>[1]>[0]) {
    const r = (await q<{ r: { order_id: string } }>("select public.create_order_tx($1::jsonb) r", [JSON.stringify({
      customer_id: IDS.customers.A, placed_by: IDS.users.customerA, delivery_date: "2026-10-10", payment_terms: "on_delivery",
      totals: { goods_net_pence: 2880, goods_vat_pence: 340, delivery_net_pence: 0, delivery_vat_pence: 0, vat_pence: 340, total_pence: 3220 },
      supplier_orders: [
        { supplier_id: IDS.suppliers.A, items: [{ variant_id: IDS.variants.rice5, product_name: "Rice", size_label: "5 kg", qty: 1, unit_price_pence: 1180, unit_cost_pence: 1000, vat_rate_bp: 0, line_net_pence: 1180, line_vat_pence: 0 }] },
        { supplier_id: IDS.suppliers.B, items: [{ variant_id: IDS.variants.mango, product_name: "Mango", size_label: "330 ml", qty: 1, unit_price_pence: 1700, unit_cost_pence: 1450, vat_rate_bp: 2000, line_net_pence: 1700, line_vat_pence: 340 }] },
      ],
    })]))[0].r;
    const parts = await q<{ id: string; supplier_id: string }>("select id, supplier_id from public.supplier_orders where order_id = $1", [r.order_id]);
    return { orderId: r.order_id, soA: parts.find((p) => p.supplier_id === IDS.suppliers.A)!.id, soB: parts.find((p) => p.supplier_id === IDS.suppliers.B)!.id };
  }
  const proof = (extra: Record<string, unknown>) => JSON.stringify({ submitted_by_kind: "driver", photo_path: "p.jpg", signature_path: "s.png", ...extra });

  it.each(NON_ADMINS)("%s cannot call the delivery functions", async (actor) => {
    for (const sql of [
      "select public.rollup_order_status(gen_random_uuid())",
      "select public.set_supplier_order_status(gen_random_uuid(), 'sent', null)",
      `select public.create_driver_link(gen_random_uuid(), ${hash(1)}, now(), null)`,
      "select public.record_delivery_proof('{}'::jsonb)",
    ]) {
      expect(await as(db, actor, (q) => outcome(q(sql))), `${actor}: ${sql}`).toBe(DENIED);
    }
  });

  it("a new link revokes the unused one; a used, revoked or expired link records nothing", async () => {
    await asOwner(db, async (q) => {
      const o = await order(q);
      const first = (await q<{ id: string }>(`select public.create_driver_link($1, ${hash(1)}, now() + interval '1 hour', null) id`, [o.soA]))[0].id;
      const second = (await q<{ id: string }>(`select public.create_driver_link($1, ${hash(2)}, now() + interval '1 hour', null) id`, [o.soA]))[0].id;
      const rows = await q<{ id: string; revoked: boolean }>("select id, revoked_at is not null revoked from public.delivery_proofs where supplier_order_id = $1", [o.soA]);
      expect(rows.find((r) => r.id === first)?.revoked).toBe(true);
      expect(rows.find((r) => r.id === second)?.revoked).toBe(false);

      await q("savepoint s");
      expect(await outcome(q("select public.record_delivery_proof($1::jsonb)", [proof({ proof_id: first })]))).toBe("P0002");
      await q("rollback to savepoint s");

      const r = (await q<{ r: { order_status: string } }>("select public.record_delivery_proof($1::jsonb) r", [proof({ proof_id: second })]))[0].r;
      expect(r.order_status).toBe("partially_delivered");
      await q("savepoint s2");
      expect(await outcome(q("select public.record_delivery_proof($1::jsonb)", [proof({ proof_id: second })]))).toBe("P0002");
      await q("rollback to savepoint s2");

      const expired = (await q<{ id: string }>(`select public.create_driver_link($1, ${hash(3)}, now() - interval '1 minute', null) id`, [o.soB]))[0].id;
      await q("savepoint s3");
      expect(await outcome(q("select public.record_delivery_proof($1::jsonb)", [proof({ proof_id: expired })]))).toBe("P0002");
      await q("rollback to savepoint s3");
    });
  });

  it("a proof needs a photo and a signed document or signature", async () => {
    await asOwner(db, async (q) => {
      const o = await order(q);
      for (const bad of [{ photo_path: "" }, { signature_path: null }]) {
        await q("savepoint s");
        expect(await outcome(q("select public.record_delivery_proof($1::jsonb)", [proof({ supplier_order_id: o.soA, ...bad })]))).toBe("P0001");
        await q("rollback to savepoint s");
      }
    });
  });

  it("statuses only move forward; delivered only comes with a proof; the order rolls up", async () => {
    await asOwner(db, async (q) => {
      const o = await order(q);
      const st = (so: string, s: string) => q<{ r: string }>("select public.set_supplier_order_status($1, $2::public.supplier_order_status, null) r", [so, s]);
      expect((await st(o.soA, "sent"))[0].r).toBe("sent");
      expect((await st(o.soB, "out_for_delivery"))[0].r).toBe("out_for_delivery");
      for (const [so, s] of [[o.soA, "placed"], [o.soA, "sent"], [o.soB, "sent"], [o.soA, "delivered"], [o.soA, "cancelled"]]) {
        await q("savepoint s");
        expect(await outcome(st(so, s)), `${s}`).toBe("P0001");
        await q("rollback to savepoint s");
      }
      await q("select public.record_delivery_proof($1::jsonb)", [proof({ supplier_order_id: o.soA, submitted_by_kind: "supplier" })]);
      await q("select public.record_delivery_proof($1::jsonb)", [proof({ supplier_order_id: o.soB, submitted_by_kind: "supplier" })]);
      const [ord] = await q<{ status: string }>("select status::text from public.orders where id = $1", [o.orderId]);
      expect(ord.status).toBe("delivered");
      await q("savepoint s");
      expect(await outcome(st(o.soA, "out_for_delivery"))).toBe("P0001");
      await q("rollback to savepoint s");
    });
  });

  it("proofs are visible to the order's restaurant and supplier only, never with the token hash", async () => {
    const seen = await asOwner(db, async (q) => {
      const o = await order(q);
      await q("select public.record_delivery_proof($1::jsonb)", [proof({ supplier_order_id: o.soA, submitted_by_kind: "supplier" })]);
      const out: Record<string, number> = {};
      for (const actor of ["customerA", "customerB", "pending", "supplierA", "supplierB"] as const) {
        await q("savepoint v");
        await q("set local role authenticated");
        await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: IDS.users[actor], role: "authenticated" })]);
        const c = (await q("select 1 from public.customer_delivery_proofs where supplier_order_id = $1", [o.soA])).length;
        const s = (await q("select 1 from public.supplier_delivery_proofs where supplier_order_id = $1", [o.soA])).length;
        const raw = (await q("select 1 from public.delivery_proofs")).length;
        out[actor] = c * 100 + s * 10 + raw;
        await q("rollback to savepoint v");
      }
      return out;
    });
    expect(seen).toEqual({ customerA: 100, customerB: 0, pending: 0, supplierA: 10, supplierB: 0 });
    for (const view of ["customer_delivery_proofs", "supplier_delivery_proofs"]) {
      const cols = await as(db, "customerA", (q) => q<{ column_name: string }>("select column_name from information_schema.columns where table_schema = 'public' and table_name = $1", [view]));
      expect(cols.map((c) => c.column_name)).not.toContain("token_hash");
      expect(await rowsOrDenied("anon", `select * from public.${view}`)).toBe(DENIED);
    }
  });

  it.each(NON_ADMINS)("%s cannot read or write private proof files", async (actor) => {
    const r = await asOwner(db, async (q) => {
      await q("insert into storage.objects (bucket_id, name) values ('delivery-proofs', 'x/y/photo.jpg')");
      await q("savepoint s");
      if (actor === "anon") {
        await q("set local role anon");
        await q(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
      } else {
        await q("set local role authenticated");
        await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: IDS.users[actor as keyof typeof IDS.users], role: "authenticated" })]);
      }
      const read = (await q("select 1 from storage.objects where bucket_id = 'delivery-proofs'")).length;
      const write = await outcome(q("insert into storage.objects (bucket_id, name) values ('delivery-proofs', 'x/y/evil.jpg')"));
      return { read, write };
    });
    expect(r).toEqual({ read: 0, write: DENIED });
  });
});
