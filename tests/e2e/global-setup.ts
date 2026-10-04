import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { runImport } from "../../src/lib/import/apply";

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
  await db.query("delete from public.products where name like 'E2E %' or category_id in (select id from public.categories where name like 'E2E %')");
  await db.query("delete from public.categories where name like 'E2E %'");
  await db.query("delete from public.suppliers where name like 'E2E %'");
  await db.end();

  // The sample catalogue (tests/fixtures) gives the public pages enough products to paginate.
  // Same importer as the admin screen; idempotent, so repeated runs add nothing.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
    { auth: { persistSession: false } },
  );
  const { data: supplier } = await admin.from("suppliers").select("id").eq("name", "Dev Supplier A").single();
  await runImport(admin, readFileSync("tests/fixtures/catalogue-sample.csv", "utf8"), { source: "sample", supplierId: supplier?.id ?? null, dryRun: false });

  await fetch("http://127.0.0.1:54324/api/v1/messages", { method: "DELETE" }).catch(() => undefined);
}
