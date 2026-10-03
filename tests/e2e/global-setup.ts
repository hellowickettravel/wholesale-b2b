import { Client } from "pg";

/** Clean slate for repeatable runs: reset rate-limit counters and remove E2E-created users. */
export default async function globalSetup() {
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
  await db.connect();
  await db.query("truncate public.rate_limits");
  const { rows } = await db.query<{ customer_id: string | null }>(
    "select customer_id from public.profiles where email like 'e2e-%@example.com'",
  );
  await db.query("delete from auth.users where email like 'e2e-%@example.com'");
  const ids = rows.map((r) => r.customer_id).filter(Boolean);
  if (ids.length) await db.query("delete from public.customers where id = any($1::uuid[])", [ids]);
  await db.query("delete from public.suppliers where name like 'E2E %'");
  await db.end();
  await fetch("http://127.0.0.1:54324/api/v1/messages", { method: "DELETE" }).catch(() => undefined);
}
